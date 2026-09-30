package com.dallimo.dallimoserver.auth.application;

import com.dallimo.dallimoserver.auth.domain.TokenHashes;
import com.dallimo.dallimoserver.auth.infrastructure.PasswordResetJdbcRepository;
import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.mail.MailSender;
import com.dallimo.dallimoserver.user.application.UserService;
import com.dallimo.dallimoserver.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * 비밀번호 변경 · 재설정 (사용자 결정: 이메일 인증 메일은 Resend, FOUNDATION-DECISION-LOG 58항).
 * - 변경: 지금 비밀번호를 확인하고 바꾼다. 이 기기 세션만 남기고 다른 기기는 로그아웃
 * - 재설정: 이메일로 6자리 인증 코드(10분, 5번까지 틀릴 수 있음)를 보내고, 코드가 맞으면 바꾼다. 모든 기기 로그아웃
 * 가입하지 않은 이메일이어도 코드 요청은 같은 응답이다 (가입 여부를 알 수 없게). 메일은 커밋 뒤 따로 보낸다(응답 시간으로도 알 수 없게)
 */
@Service
public class PasswordService {

    private static final Logger log = LoggerFactory.getLogger(PasswordService.class);
    // 값은 명세에 없어 정한 시작값 (backend/README 결정 사항)
    static final Duration CODE_TTL = Duration.ofMinutes(10);
    static final int MAX_ATTEMPTS = 5;
    // 같은 계정에 코드를 다시 보내는 간격 · 한 시간에 보내는 최대 수 (메일 폭탄 방지)
    static final Duration RESEND_AFTER = Duration.ofSeconds(60);
    static final int MAX_PER_HOUR = 5;

    /** 커밋 뒤 보낼 메일 */
    public record MailEvent(MailSender.Mail mail, String kind, long userId) {
    }

    private final UserService users;
    private final PasswordResetJdbcRepository codes;
    private final RefreshSessionRepository sessions;
    private final PasswordEncoder passwords;
    private final ApplicationEventPublisher events;
    private final MailSender mail;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public PasswordService(UserService users, PasswordResetJdbcRepository codes, RefreshSessionRepository sessions, PasswordEncoder passwords,
                           ApplicationEventPublisher events, MailSender mail, Clock clock) {
        this.users = users;
        this.codes = codes;
        this.sessions = sessions;
        this.passwords = passwords;
        this.events = events;
        this.mail = mail;
        this.clock = clock;
    }

    /** 로그인한 사람: 지금 비밀번호 확인 → 변경 → 다른 기기 로그아웃 → 알림 메일 */
    @Transactional
    public void change(long userId, long sessionId, String currentPassword, String newPassword) {
        User user = users.get(userId);
        if (user.getPasswordHash() == null || !passwords.matches(currentPassword, user.getPasswordHash())) throw new ApiException(ErrorCode.PASSWORD_MISMATCH);
        if (currentPassword.equals(newPassword)) throw new ApiException(ErrorCode.VALIDATION_ERROR, "지금 비밀번호와 다른 비밀번호로 바꿔 주세요.");
        Instant now = clock.instant();
        user.changePassword(passwords.encode(newPassword), now);
        sessions.revokeOthersOfUser(userId, sessionId, now);
        events.publishEvent(new MailEvent(PasswordMails.changed(user.getEmail(), now), "PASSWORD_CHANGED", userId));
        log.info("password.change user={}", userId);
    }

    /** 인증 코드 보내기. 가입하지 않았거나 너무 자주 요청하면 조용히 넘어간다 (응답은 같다) */
    @Transactional
    public void requestReset(String email) {
        User user = users.findByEmail(email).filter(User::isActive).orElse(null);
        if (user == null || user.getPasswordHash() == null) return;
        Instant now = clock.instant();
        if (codes.issuedSince(user.getId(), now.minus(RESEND_AFTER)) > 0 || codes.issuedSince(user.getId(), now.minus(Duration.ofHours(1))) >= MAX_PER_HOUR) {
            log.info("password.reset-code user={} skipped=too-often", user.getId());
            return;
        }
        String code = "%06d".formatted(random.nextInt(1_000_000));
        codes.issue(user.getId(), hash(user.getId(), code), now.plus(CODE_TTL), now);
        events.publishEvent(new MailEvent(PasswordMails.resetCode(user.getEmail(), code, CODE_TTL.toMinutes()), "PASSWORD_RESET_CODE", user.getId()));
        log.info("password.reset-code user={} issued", user.getId());
    }

    /** 코드가 맞으면 새 비밀번호로 바꾸고 모든 기기를 로그아웃한다. 틀린 횟수는 롤백하지 않는다 */
    @Transactional(noRollbackFor = ApiException.class)
    public void reset(String email, String code, String newPassword) {
        User user = users.findByEmail(email).filter(User::isActive).orElseThrow(() -> new ApiException(ErrorCode.RESET_CODE_INVALID));
        Instant now = clock.instant();
        PasswordResetJdbcRepository.Code active = codes.activeForUpdate(user.getId()).orElseThrow(() -> new ApiException(ErrorCode.RESET_CODE_INVALID));
        if (active.expiresAt().isBefore(now) || active.attempts() >= MAX_ATTEMPTS) throw new ApiException(ErrorCode.RESET_CODE_INVALID);
        if (!TokenHashes.matches(active.codeHash(), hash(user.getId(), code))) {
            codes.failed(active.id());
            log.info("password.reset user={} result=WRONG_CODE attempts={}", user.getId(), active.attempts() + 1);
            throw new ApiException(ErrorCode.RESET_CODE_INVALID);
        }
        codes.used(active.id(), now);
        user.changePassword(passwords.encode(newPassword), now);
        sessions.revokeAllOfUser(user.getId(), now);
        events.publishEvent(new MailEvent(PasswordMails.changed(user.getEmail(), now), "PASSWORD_CHANGED", user.getId()));
        log.info("password.reset user={} result=CHANGED", user.getId());
    }

    /** 커밋된 뒤 따로 보낸다. 못 보내도 요청은 성공이다 (코드는 다시 받을 수 있다) */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMail(MailEvent e) {
        try {
            mail.send(e.mail());
            log.info("mail.sent kind={} user={}", e.kind(), e.userId());
        } catch (RuntimeException ex) {
            log.warn("mail.failed kind={} user={}: {}", e.kind(), e.userId(), ex.getMessage());
        }
    }

    // 코드는 사용자별로 섞어 SHA-256으로만 남긴다
    private static String hash(long userId, String code) {
        return TokenHashes.sha256(userId + ":" + code);
    }
}
