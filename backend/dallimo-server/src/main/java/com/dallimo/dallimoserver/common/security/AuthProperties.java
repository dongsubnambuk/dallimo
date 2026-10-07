package com.dallimo.dallimoserver.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

/**
 * 인증 설정 (application*.yaml의 dallimo.auth). 비밀 키는 저장소에 넣지 않고 환경변수 JWT_SECRET으로 받는다.
 *
 * @param jwtSecret           HS256 키 (Base64, 32바이트 이상)
 * @param issuer              JWT iss
 * @param accessTokenTtl      Access Token 유효 시간
 * @param refreshTokenTtl     Refresh Token 유효 시간 (refresh할 때마다 다시 늘어난다)
 * @param refreshReuseGrace   회전 직후 바로 전 Refresh Token을 한 번 더 받아 주는 시간 (응답을 못 받은 재시도)
 * @param corsAllowedOrigins  브라우저에서 부를 수 있는 출처 (웹 개발 확인용)
 */
@ConfigurationProperties(prefix = "dallimo.auth")
public record AuthProperties(
        String jwtSecret,
        String issuer,
        Duration accessTokenTtl,
        Duration refreshTokenTtl,
        Duration refreshReuseGrace,
        List<String> corsAllowedOrigins) {

    public AuthProperties {
        if (issuer == null) issuer = "dallimo";
        if (accessTokenTtl == null) accessTokenTtl = Duration.ofMinutes(30);
        if (refreshTokenTtl == null) refreshTokenTtl = Duration.ofDays(30);
        if (refreshReuseGrace == null) refreshReuseGrace = Duration.ofDays(7);
        if (corsAllowedOrigins == null) corsAllowedOrigins = List.of();
    }
}
