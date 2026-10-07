package com.dallimo.dallimoserver.auth.application;

import com.dallimo.dallimoserver.running.infrastructure.RunHeartRateJdbcRepository;
import com.dallimo.dallimoserver.auth.domain.RefreshSession;
import com.dallimo.dallimoserver.auth.domain.TokenHashes;
import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.security.AuthProperties;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.user.application.UserService;
import com.dallimo.dallimoserver.user.domain.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * 이메일 가입 · 로그인과 세션(14.1장). 세션은 기기마다 하나이고 Refresh Token은 쓸 때마다 새로 바뀐다(회전).
 * 이미 바뀐 옛 Refresh Token이 다시 오면 탈취로 보고 그 세션을 끊는다.
 */
@Service
public class AuthService {

    private final UserService users;
    private final FriendService friends;
    private final NotificationService notifications;
    private final RefreshSessionRepository sessions;
    private final PasswordEncoder passwords;
    private final TokenIssuer tokens;
    private final AuthProperties props;
    private final Clock clock;
    private final RunHeartRateJdbcRepository heartRates;
    // 없는 이메일로 로그인해도 비밀번호 확인 시간이 비슷하게 걸리도록 (가입 여부를 시간으로 알 수 없게)
    private final String dummyHash;

    public AuthService(UserService users, FriendService friends, NotificationService notifications, RefreshSessionRepository sessions,
                       PasswordEncoder passwords, TokenIssuer tokens, AuthProperties props, Clock clock, RunHeartRateJdbcRepository heartRates) {
        this.heartRates = heartRates;
        this.users = users;
        this.friends = friends;
        this.notifications = notifications;
        this.sessions = sessions;
        this.passwords = passwords;
        this.tokens = tokens;
        this.props = props;
        this.clock = clock;
        this.dummyHash = passwords.encode("dallimo-dummy-password");
    }

    public record Session(User user, String accessToken, Instant accessTokenExpiresAt, String refreshToken, Instant refreshTokenExpiresAt) {
    }

    @Transactional
    public Session signup(String email, String password, String nickname, String deviceId) {
        User user = users.createEmailUser(email, passwords.encode(password), nickname);
        return open(user, deviceId);
    }

    @Transactional
    public Session login(String email, String password, String deviceId) {
        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            passwords.matches(password, dummyHash);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.getPasswordHash() == null || !passwords.matches(password, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.isSuspended()) throw new ApiException(ErrorCode.ACCOUNT_SUSPENDED);
        if (!user.isActive()) throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        return open(user, deviceId);
    }

    /** Refresh Token 회전. 끊긴 세션을 기록해야 하므로 오류가 나도 롤백하지 않는다 */
    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String refreshToken, String deviceId) {
        ParsedToken parsed = ParsedToken.parse(refreshToken);
        if (parsed == null) throw unauthorized();
        Instant now = clock.instant();
        RefreshSession session = sessions.findForUpdate(parsed.sessionId()).orElseThrow(AuthService::unauthorized);
        if (!session.isActive(now)) throw unauthorized();
        String hash = TokenHashes.sha256(parsed.secret());
        boolean current = TokenHashes.matches(session.getTokenHash(), hash);
        boolean retry = !current && session.isPreviousWithinGrace(hash, now, props.refreshReuseGrace());
        if ((!current && !retry) || !session.getDeviceId().equals(deviceId)) {
            // 이미 쓴 토큰이 다시 왔거나 다른 기기에서 왔다: 탈취로 보고 세션을 끊는다
            session.revoke(now);
            throw unauthorized();
        }
        User user;
        try {
            user = users.get(session.getUserId());
        } catch (ApiException e) {
            session.revoke(now);
            throw unauthorized();
        }
        String secret = tokens.newSecret();
        session.rotate(TokenHashes.sha256(secret), now, props.refreshTokenTtl());
        return issue(user, session, secret, now);
    }

    /** 이 기기 세션을 끊고, 이 기기로는 Push를 보내지 않는다 */
    @Transactional
    public void logout(long userId, long sessionId) {
        sessions.findForUpdate(sessionId)
                .filter(s -> s.getUserId() == userId)
                .ifPresent(s -> {
                    notifications.unregisterSession(userId, sessionId);
                    s.revoke(clock.instant());
                });
    }

    /** 탈퇴(AUTH-004): 계정 정보를 지우고 모든 기기의 세션을 끊는다. 친구 · 친구 요청도 끝내고 Push 토큰을 지운다 */
    @Transactional
    public void withdraw(long userId) {
        users.withdraw(userId);
        // 심박(건강정보)은 탈퇴하면 바로 지운다 (FOUNDATION-DECISION-LOG 65항)
        heartRates.deleteAllOfUser(userId);
        friends.endAllOf(userId);
        notifications.forgetUser(userId);
        sessions.revokeAllOfUser(userId, clock.instant());
    }

    /** 이 기기에 새 세션을 연다. 같은 기기의 이전 세션은 지운다 (그 세션의 Access Token도 바로 막힌다). 관리자 로그인(AdminAccountService)도 쓴다 */
    @Transactional
    public Session open(User user, String deviceId) {
        Instant now = clock.instant();
        sessions.deleteByUserIdAndDeviceId(user.getId(), deviceId);
        String secret = tokens.newSecret();
        RefreshSession session = sessions.save(RefreshSession.open(user.getId(), deviceId, TokenHashes.sha256(secret), now, props.refreshTokenTtl()));
        return issue(user, session, secret, now);
    }

    private Session issue(User user, RefreshSession session, String secret, Instant now) {
        TokenIssuer.AccessToken access = tokens.accessToken(user.getId(), session.getId(), now);
        return new Session(user, access.value(), access.expiresAt(), session.getId() + "." + secret, session.getExpiresAt());
    }

    private static ApiException unauthorized() {
        return new ApiException(ErrorCode.AUTH_REQUIRED, "다시 로그인해 주세요.");
    }

    /** Refresh Token 모양: {세션 id}.{비밀값} */
    private record ParsedToken(long sessionId, String secret) {
        static ParsedToken parse(String token) {
            if (token == null) return null;
            int dot = token.indexOf('.');
            if (dot <= 0 || dot == token.length() - 1) return null;
            try {
                return new ParsedToken(Long.parseLong(token.substring(0, dot)), token.substring(dot + 1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
    }
}
