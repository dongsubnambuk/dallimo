package com.dallimo.dallimoserver.common.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * 요청마다 요청 id. 앱이 X-Request-Id를 보내면 그 값을, 없거나 모양이 틀리면 새로 만든다.
 * 응답 헤더에도 돌려줘서 앱 로그 · 문의와 서버 로그를 맞춰 볼 수 있다. 보안 필터보다 먼저 돈다
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String given = request.getHeader(Correlation.HEADER);
        String id = Correlation.validRequestId(given) ? given : UUID.randomUUID().toString();
        MDC.put(Correlation.REQUEST_ID, id);
        response.setHeader(Correlation.HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(Correlation.REQUEST_ID);
            MDC.remove(Correlation.USER_ID);
            MDC.remove(Correlation.RUN_ID);
        }
    }
}
