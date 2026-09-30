package com.dallimo.dallimoserver.auth.application;

import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.user.application.UserService;
import com.dallimo.dallimoserver.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * 비밀번호 변경 (FOUNDATION-DECISION-LOG 58항). 지금 비밀번호를 확인하고 바꾼다. 이 기기 세션만 남기고 다른 기기는 로그아웃.
 * 이메일 인증 코드로 하는 재설정 · 알림 메일은 뺐다 (사용자 결정: 메일을 보내지 않는다, 결정 로그 60항)
 */
@Service
public class PasswordService {

    private static final Logger log = LoggerFactory.getLogger(PasswordService.class);

    private final UserService users;
    private final RefreshSessionRepository sessions;
    private final PasswordEncoder passwords;
    private final Clock clock;

    public PasswordService(UserService users, RefreshSessionRepository sessions, PasswordEncoder passwords, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.passwords = passwords;
        this.clock = clock;
    }

    /** 로그인한 사람: 지금 비밀번호 확인 → 변경 → 다른 기기 로그아웃 */
    @Transactional
    public void change(long userId, long sessionId, String currentPassword, String newPassword) {
        User user = users.get(userId);
        if (user.getPasswordHash() == null || !passwords.matches(currentPassword, user.getPasswordHash())) throw new ApiException(ErrorCode.PASSWORD_MISMATCH);
        if (currentPassword.equals(newPassword)) throw new ApiException(ErrorCode.VALIDATION_ERROR, "지금 비밀번호와 다른 비밀번호로 바꿔 주세요.");
        Instant now = clock.instant();
        user.changePassword(passwords.encode(newPassword), now);
        sessions.revokeOthersOfUser(userId, sessionId, now);
        log.info("password.change user={}", userId);
    }
}
