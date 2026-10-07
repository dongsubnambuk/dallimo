package com.dallimo.dallimoserver.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 18장 관측성: Prometheus가 지표를 가져가는 /actuator/prometheus. 사용자 JWT가 아니라 METRICS_TOKEN(Bearer)으로만 연다.
 * 토큰이 비어 있으면 닫는다. 사용자 API 체인(SecurityConfig)보다 먼저 본다 (그 체인은 Bearer를 JWT로 읽으려 한다)
 */
@Configuration(proxyBeanMethods = false)
public class MetricsSecurityConfig {

    static final String PATH = "/actuator/prometheus";

    @Bean
    @Order(1)
    @ConditionalOnWebApplication
    SecurityFilterChain metricsSecurityFilterChain(HttpSecurity http, @Value("${dallimo.metrics.token:}") String token) throws Exception {
        http.securityMatcher(PATH)
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new TokenFilter(token), AuthorizationFilter.class)
                .authorizeHttpRequests(a -> a.anyRequest().permitAll());
        return http.build();
    }

    /** Authorization: Bearer {METRICS_TOKEN}이 맞아야 지나간다 */
    static final class TokenFilter extends OncePerRequestFilter {

        private final byte[] expected;

        TokenFilter(String token) {
            this.expected = token == null || token.isBlank() ? null : token.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
            String header = req.getHeader("Authorization");
            String given = header == null ? null : header.replaceFirst("(?i)^Bearer\\s+", "");
            if (expected == null || given == null || !MessageDigest.isEqual(expected, given.getBytes(StandardCharsets.UTF_8))) {
                res.setStatus(expected == null ? HttpServletResponse.SC_NOT_FOUND : HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
            chain.doFilter(req, res);
        }
    }
}
