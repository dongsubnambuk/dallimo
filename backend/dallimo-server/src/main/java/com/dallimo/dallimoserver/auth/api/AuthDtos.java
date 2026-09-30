package com.dallimo.dallimoserver.auth.api;

import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.user.api.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** 인증 API 요청 · 응답 (명세 41장을 이메일 로그인으로 바꾼 것) */
public final class AuthDtos {

    private AuthDtos() {
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    public static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*\\d)\\S{8,64}$";

    public record SignupRequest(
            @NotBlank @Email @Size(max = 191) String email,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = "8~64자, 영문과 숫자를 함께 써 주세요.") String password,
            @NotBlank @Size(max = 40) String nickname,
            @NotBlank @Size(max = 100) String deviceId) {

        // 앞뒤 공백은 검증 전에 뺀다
        public SignupRequest {
            email = trim(email);
            nickname = trim(nickname);
        }
    }

    public record LoginRequest(
            @NotBlank @Size(max = 191) String email,
            @NotBlank @Size(max = 64) String password,
            @NotBlank @Size(max = 100) String deviceId) {

        public LoginRequest {
            email = trim(email);
        }
    }

    /** 비밀번호 변경 (로그인한 사람) */
    public record PasswordChangeRequest(
            @NotBlank @Size(max = 64) String currentPassword,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = "8~64자, 영문과 숫자를 함께 써 주세요.") String newPassword) {
    }

    /** 비밀번호 재설정 인증 코드 받기 */
    public record ResetCodeRequest(@NotBlank @Email @Size(max = 191) String email) {

        public ResetCodeRequest {
            email = trim(email);
        }
    }

    /** 인증 코드로 비밀번호 재설정 */
    public record PasswordResetRequest(
            @NotBlank @Email @Size(max = 191) String email,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "인증 코드 6자리를 넣어 주세요.") String code,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = "8~64자, 영문과 숫자를 함께 써 주세요.") String newPassword) {

        public PasswordResetRequest {
            email = trim(email);
            code = trim(code);
        }
    }

    public record RefreshRequest(
            @NotBlank @Size(max = 200) String refreshToken,
            @NotBlank @Size(max = 100) String deviceId) {
    }

    public record AuthResponse(
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken,
            Instant refreshTokenExpiresAt,
            UserResponse user) {

        static AuthResponse from(AuthService.Session s) {
            return new AuthResponse(s.accessToken(), s.accessTokenExpiresAt(), s.refreshToken(), s.refreshTokenExpiresAt(), UserResponse.from(s.user()));
        }
    }
}
