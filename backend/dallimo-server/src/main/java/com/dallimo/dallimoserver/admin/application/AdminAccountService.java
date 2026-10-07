package com.dallimo.dallimoserver.admin.application;

import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.user.application.FriendCodes;
import com.dallimo.dallimoserver.user.application.UserService;
import com.dallimo.dallimoserver.user.domain.User;
import com.dallimo.dallimoserver.user.infrastructure.UserJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;

/**
 * 관리 웹 관리자 계정 (사용자 결정, FOUNDATION-DECISION-LOG 86항).
 * - 서버가 켜질 때 관리자 계정(admin@naver.com)이 없으면 만든다. 환경변수 설정이 필요 없다
 * - 비밀번호는 저장소(공개)에 넣지 않는다. 관리 웹에서 처음 한 번 정하고, 그 뒤에는 다시 정할 수 없다
 * - 앱 가입 계정(provider EMAIL)과 따로라서 같은 이메일로 앱에 가입해도 관리자가 아니고, 비밀번호 재설정 메일도 관리자 계정에는 가지 않는다
 */
@Service
public class AdminAccountService implements ApplicationRunner {

    public static final String EMAIL = "admin@naver.com";
    private static final String NICKNAME = "달리모 관리자";
    private static final Logger log = LoggerFactory.getLogger(AdminAccountService.class);

    public record Setup(String email, boolean needed) {
    }

    private final UserJpaRepository users;
    private final AuthService auth;
    private final PasswordEncoder passwords;
    private final TransactionTemplate tx;
    private final Clock clock;

    public AdminAccountService(UserJpaRepository users, AuthService auth, PasswordEncoder passwords, TransactionTemplate tx, Clock clock) {
        this.users = users;
        this.auth = auth;
        this.passwords = passwords;
        this.tx = tx;
        this.clock = clock;
    }

    /** 서버가 켜질 때 관리자 계정을 만든다 (이미 있으면 그대로) */
    @Override
    public void run(ApplicationArguments args) {
        try {
            tx.executeWithoutResult(s -> {
                if (users.findByProviderAndProviderUserId(User.PROVIDER_ADMIN, EMAIL).isPresent()) return;
                String nickname = users.existsByNickname(NICKNAME) ? NICKNAME + " " + FriendCodes.next().substring(4) : NICKNAME;
                String code;
                do {
                    code = FriendCodes.next();
                } while (users.existsByFriendCode(code));
                users.saveAndFlush(User.adminUser(EMAIL, nickname, code, clock.instant()));
                log.info("admin.account created email={} (비밀번호는 관리 웹에서 처음 정한다)", EMAIL);
            });
        } catch (DataIntegrityViolationException race) {
            // 다른 서버가 먼저 만들었다
        }
    }

    @Transactional(readOnly = true)
    public Setup setup() {
        return new Setup(EMAIL, admin().getPasswordHash() == null);
    }

    /** 처음 한 번 비밀번호를 정하고 로그인한다. 이미 정했으면 409 */
    @Transactional
    public AuthService.Session setUp(String password, String deviceId) {
        User u = users.findByProviderAndProviderUserIdForUpdate(User.PROVIDER_ADMIN, EMAIL).orElseThrow(AdminAccountService::missing);
        if (u.getPasswordHash() != null) throw new ApiException(ErrorCode.USER_INVALID_STATE, "관리자 비밀번호가 이미 정해져 있어요. 로그인해 주세요.");
        u.changePassword(passwords.encode(password), clock.instant());
        return auth.open(u, deviceId);
    }

    @Transactional
    public AuthService.Session login(String email, String password, String deviceId) {
        User u = users.findByProviderAndProviderUserId(User.PROVIDER_ADMIN, UserService.normalizeEmail(email)).orElse(null);
        if (u == null || u.getPasswordHash() == null || !passwords.matches(password, u.getPasswordHash()) || !u.isActive()) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        return auth.open(u, deviceId);
    }

    private User admin() {
        return users.findByProviderAndProviderUserId(User.PROVIDER_ADMIN, EMAIL).orElseThrow(AdminAccountService::missing);
    }

    private static ApiException missing() {
        return new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "관리자 계정이 아직 없어요. 서버를 다시 켜 주세요.");
    }
}
