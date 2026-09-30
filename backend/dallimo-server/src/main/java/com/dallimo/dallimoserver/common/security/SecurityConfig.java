package com.dallimo.dallimoserver.common.security;

import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.dallimo.dallimoserver.common.ratelimit.RateLimitFilter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

/**
 * 14.1장 인증. 서버 세션을 두지 않고(STATELESS) 요청마다 Bearer Access Token(JWT)을 확인한다.
 * 가입 · 로그인 · refresh와 health만 토큰 없이 부를 수 있다.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

    // 서버와 기기 시계가 조금 어긋나도 막 만든 토큰을 거절하지 않도록
    private static final Duration CLOCK_SKEW = Duration.ofSeconds(30);

    @Bean
    @ConditionalOnWebApplication
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder, ApiSecurityErrors errors, RateLimitFilter rateLimit) throws Exception {
        http
                // 요청 제한은 토큰을 읽은 뒤 (로그인한 사람은 사람마다 센다)
                .addFilterAfter(rateLimit, BearerTokenAuthenticationFilter.class)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/nickname-availability").permitAll()
                        // 43장 코스 조회는 로그인 없이도 (User/Optional). 토큰이 있으면 내 기록 · 저장 여부를 함께 준다
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/**").permitAll()
                        // SHR-004 공유 링크 해석 · 공유 페이지는 로그인 없이
                        .requestMatchers(HttpMethod.GET, "/api/v1/shares/*", "/s/*").permitAll()
                        // 올린 프로필 사진 (친구 · 랭킹에서 보인다, 주소는 추측할 수 없는 uuid)
                        .requestMatchers(HttpMethod.GET, "/files/**").permitAll()
                        // App Link · Universal Link 확인 파일
                        .requestMatchers(HttpMethod.GET, "/.well-known/apple-app-site-association", "/.well-known/assetlinks.json").permitAll()
                        // 8장 WebSocket 연결. 인증은 STOMP CONNECT의 Access Token으로 한다 (StompAuthInterceptor)
                        .requestMatchers("/ws", "/ws/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info", "/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o
                        .jwt(j -> j.decoder(jwtDecoder))
                        .authenticationEntryPoint(errors.entryPoint())
                        .accessDeniedHandler(errors.accessDeniedHandler()))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(errors.entryPoint())
                        .accessDeniedHandler(errors.accessDeniedHandler()));
        return http.build();
    }

    /** 요청 제한 필터는 보안 체인 안에서만 돈다 (서블릿 필터로 한 번 더 붙지 않게) */
    @Bean
    FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter filter) {
        FilterRegistrationBean<RateLimitFilter> r = new FilterRegistrationBean<>(filter);
        r.setEnabled(false);
        return r;
    }

    @Bean
    SecretKey jwtSecretKey(AuthProperties props) {
        if (props.jwtSecret() == null || props.jwtSecret().isBlank()) {
            throw new IllegalStateException("dallimo.auth.jwt-secret(JWT_SECRET)이 설정되지 않았습니다");
        }
        byte[] key = Base64.getDecoder().decode(props.jwtSecret());
        if (key.length < 32) throw new IllegalStateException("JWT 키는 32바이트(256비트) 이상이어야 합니다");
        return new SecretKeySpec(key, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey key, AuthProperties props, RefreshSessionRepository sessions, Clock clock) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        JwtTimestampValidator timestamps = new JwtTimestampValidator(CLOCK_SKEW);
        timestamps.setClock(clock);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                timestamps,
                new JwtIssuerValidator(props.issuer()),
                new SessionValidator(sessions, clock)));
        return decoder;
    }

    /** 비밀번호 해시. {bcrypt} 접두어가 붙어 나중에 알고리즘을 바꿔도 기존 해시를 읽는다 */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AuthProperties props) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(props.corsAllowedOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }
}
