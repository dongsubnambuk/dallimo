package com.dallimo.dallimoserver.common.ratelimit;

import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.ratelimit.RateLimiter.Rule;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

/**
 * REST 요청 제한 (27장 RATE_LIMITED 429). 인증 뒤에 돌아 로그인한 사람은 사람마다, 아니면 IP마다 센다.
 * 넘으면 Retry-After와 함께 27.1장 오류 모양으로 돌려준다.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter limiter;
    private final JsonMapper json;

    public RateLimitFilter(RateLimiter limiter, JsonMapper json) {
        this.limiter = limiter;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        Rule rule = ruleOf(request.getMethod(), request.getRequestURI());
        if (rule != null && !limiter.tryAcquire(rule, keyOf(rule, request))) {
            response.setStatus(ErrorCode.RATE_LIMITED.status().value());
            response.setHeader("Retry-After", String.valueOf(limiter.retryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(json.writeValueAsString(ApiResponse.fail(ErrorCode.RATE_LIMITED, ErrorCode.RATE_LIMITED.defaultMessage(), null)));
            return;
        }
        chain.doFilter(request, response);
    }

    static Rule ruleOf(String method, String path) {
        // 비밀번호 재설정 코드 요청 · 코드 확인도 로그인처럼 IP마다 (코드 맞히기 · 메일 폭탄 방지)
        if ("POST".equals(method) && (path.equals("/api/v1/auth/login") || path.equals("/api/v1/auth/signup")
                || path.equals("/api/v1/auth/password/reset-code") || path.equals("/api/v1/auth/password/reset"))) return Rule.LOGIN;
        // 비밀번호 변경은 사람마다 (지금 비밀번호 맞히기 방지)
        if ("POST".equals(method) && path.equals("/api/v1/auth/password/change")) return Rule.PROFILE_UPDATE;
        if ("GET".equals(method) && (path.equals("/api/v1/users/search") || path.equals("/api/v1/courses/search"))) return Rule.SEARCH;
        if ("POST".equals(method) && path.equals("/api/v1/friends/requests")) return Rule.FRIEND_REQUEST;
        if ("GET".equals(method) && (path.startsWith("/api/v1/shares/") || path.startsWith("/s/"))) return Rule.SHARE_RESOLVE;
        if ("PATCH".equals(method) && path.equals("/api/v1/users/me")) return Rule.PROFILE_UPDATE;
        return null;
    }

    // 로그인 · 공유 해석은 IP, 나머지는 로그인한 사람 (없으면 IP)
    private static String keyOf(Rule rule, HttpServletRequest request) {
        if (rule != Rule.LOGIN && rule != Rule.SHARE_RESOLVE) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwt) return "u:" + jwt.getName();
        }
        return "ip:" + request.getRemoteAddr();
    }
}
