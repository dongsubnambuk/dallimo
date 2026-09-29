package com.dallimo.dallimoserver.common.security;

import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Clock;

/**
 * Access Token이 가리키는 세션(sid)이 아직 살아 있는지 요청마다 확인한다.
 * 로그아웃 · 같은 기기 재로그인 · 탈취 감지로 세션이 끊기면 남은 Access Token도 바로 막힌다.
 */
public class SessionValidator implements OAuth2TokenValidator<Jwt> {

    static final String SID = "sid";
    private static final OAuth2TokenValidatorResult REVOKED =
            OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "session is not active", null));

    private final RefreshSessionRepository sessions;
    private final Clock clock;

    public SessionValidator(RefreshSessionRepository sessions, Clock clock) {
        this.sessions = sessions;
        this.clock = clock;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object sid = jwt.getClaims().get(SID);
        if (!(sid instanceof Number n) || jwt.getSubject() == null) return REVOKED;
        return sessions.findById(n.longValue())
                .filter(s -> s.isActive(clock.instant()))
                .filter(s -> String.valueOf(s.getUserId()).equals(jwt.getSubject()))
                .map(s -> OAuth2TokenValidatorResult.success())
                .orElse(REVOKED);
    }
}
