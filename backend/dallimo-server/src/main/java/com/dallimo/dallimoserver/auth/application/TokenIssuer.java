package com.dallimo.dallimoserver.auth.application;

import com.dallimo.dallimoserver.common.security.AuthProperties;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/** Access Token(JWT)과 Refresh Token 비밀값을 만든다 */
@Component
public class TokenIssuer {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtEncoder encoder;
    private final AuthProperties props;

    public TokenIssuer(JwtEncoder encoder, AuthProperties props) {
        this.encoder = encoder;
        this.props = props;
    }

    public record AccessToken(String value, Instant expiresAt) {
    }

    /** sub = 사용자 id, sid = 세션(tbl_refresh_token) id */
    public AccessToken accessToken(long userId, long sessionId, Instant now) {
        Instant exp = now.plus(props.accessTokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiresAt(exp)
                .claim("sid", sessionId)
                .build();
        String value = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AccessToken(value, exp);
    }

    /** Refresh Token 비밀값 (256비트 무작위) */
    public String newSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
