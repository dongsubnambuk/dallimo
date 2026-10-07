package com.dallimo.dallimoserver.admin.api;

import com.dallimo.dallimoserver.admin.application.AdminAccountService;
import com.dallimo.dallimoserver.auth.api.AuthDtos;
import com.dallimo.dallimoserver.auth.api.AuthDtos.AuthResponse;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리 웹 로그인 (FOUNDATION-DECISION-LOG 86항). 관리자 계정(admin@naver.com)은 서버가 만들고, 비밀번호는 관리 웹에서 처음 한 번 정한다.
 * 로그인하면 앱과 같은 Access · Refresh Token을 준다 (갱신 · 로그아웃은 /api/v1/auth)
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminAuthController {

    private final AdminAccountService accounts;

    public AdminAuthController(AdminAccountService accounts) {
        this.accounts = accounts;
    }

    public record SetupRequest(
            @NotBlank @Pattern(regexp = AuthDtos.PASSWORD_RULE, message = "8~64자, 영문과 숫자를 함께 써 주세요.") String password,
            @NotBlank @Size(max = 100) String deviceId) {
    }

    public record LoginRequest(@NotBlank @Size(max = 191) String email, @NotBlank @Size(max = 64) String password,
                               @NotBlank @Size(max = 100) String deviceId) {
    }

    /** 관리자 이메일과, 비밀번호를 아직 정하지 않았는지 */
    @GetMapping("/setup")
    public ApiResponse<AdminAccountService.Setup> setup() {
        return ApiResponse.ok(accounts.setup());
    }

    /** 처음 한 번 관리자 비밀번호를 정하고 로그인한다. 이미 정했으면 409 */
    @PostMapping("/setup")
    public ApiResponse<AuthResponse> setUp(@Valid @RequestBody SetupRequest req) {
        return ApiResponse.ok(AuthResponse.from(accounts.setUp(req.password(), req.deviceId())));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok(AuthResponse.from(accounts.login(req.email(), req.password(), req.deviceId())));
    }
}
