package com.dallimo.dallimoserver.common.security;

import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.Locale;

/**
 * 인증 · 권한 오류도 27.1장 모양으로 보낸다.
 * 만료된 Access Token은 TOKEN_EXPIRED(앱이 refresh 후 다시 시도), 나머지는 AUTH_REQUIRED(다시 로그인).
 */
@Component
public class ApiSecurityErrors {

    private final JsonMapper json;

    public ApiSecurityErrors(JsonMapper json) {
        this.json = json;
    }

    public AuthenticationEntryPoint entryPoint() {
        return (request, response, e) -> {
            ErrorCode code = isExpired(e) ? ErrorCode.TOKEN_EXPIRED : ErrorCode.AUTH_REQUIRED;
            response.setHeader("WWW-Authenticate", "Bearer");
            write(response, code);
        };
    }

    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, e) -> write(response, ErrorCode.RESOURCE_FORBIDDEN);
    }

    private static boolean isExpired(AuthenticationException e) {
        return e.getMessage() != null && e.getMessage().toLowerCase(Locale.ROOT).contains("expired");
    }

    private void write(HttpServletResponse response, ErrorCode code) throws IOException {
        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json.writeValueAsString(ApiResponse.fail(code, code.defaultMessage(), null)));
    }
}
