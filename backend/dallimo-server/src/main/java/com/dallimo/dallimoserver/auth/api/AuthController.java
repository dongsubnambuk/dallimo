package com.dallimo.dallimoserver.auth.api;

import com.dallimo.dallimoserver.auth.api.AuthDtos.AuthResponse;
import com.dallimo.dallimoserver.auth.api.AuthDtos.LoginRequest;
import com.dallimo.dallimoserver.auth.api.AuthDtos.RefreshRequest;
import com.dallimo.dallimoserver.auth.api.AuthDtos.SignupRequest;
import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** 이메일 · 비밀번호 · 닉네임 가입. 가입하면 바로 로그인된다 */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@Valid @RequestBody SignupRequest req) {
        AuthService.Session s = auth.signup(req.email(), req.password(), req.nickname(), req.deviceId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(AuthResponse.from(s)));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok(AuthResponse.from(auth.login(req.email(), req.password(), req.deviceId())));
    }

    /** 새 Access Token과 새 Refresh Token (회전) */
    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return ApiResponse.ok(AuthResponse.from(auth.refresh(req.refreshToken(), req.deviceId())));
    }

    /** 이 기기의 세션을 끊는다. 남은 Access Token도 바로 막힌다 */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt) {
        auth.logout(Long.parseLong(jwt.getSubject()), ((Number) jwt.getClaims().get("sid")).longValue());
        return ResponseEntity.noContent().build();
    }
}
