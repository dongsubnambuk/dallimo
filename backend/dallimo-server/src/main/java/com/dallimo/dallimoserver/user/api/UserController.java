package com.dallimo.dallimoserver.user.api;

import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.user.application.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 명세 41장 사용자 API (+ 닉네임 확인 · 탈퇴) */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService users;
    private final AuthService auth;

    public UserController(UserService users, AuthService auth) {
        this.users = users;
        this.auth = auth;
    }

    public record UpdateMeRequest(@NotBlank @Size(max = 40) String nickname) {
        public UpdateMeRequest {
            nickname = nickname == null ? null : nickname.trim();
        }
    }

    public record NicknameAvailability(boolean available) {
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(UserResponse.from(users.get(userId(jwt))));
    }

    /** 닉네임 변경. 프로필 사진 업로드는 S3 결정 뒤에 붙인다 */
    @PatchMapping("/me")
    public ApiResponse<UserResponse> updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest req) {
        return ApiResponse.ok(UserResponse.from(users.changeNickname(userId(jwt), req.nickname())));
    }

    /** 탈퇴 (AUTH-004) */
    @DeleteMapping("/me")
    public ResponseEntity<Void> withdraw(@AuthenticationPrincipal Jwt jwt) {
        auth.withdraw(userId(jwt));
        return ResponseEntity.noContent().build();
    }

    /** 가입 · 변경 전 닉네임 중복 확인. 로그인 없이 부를 수 있다 */
    @GetMapping("/nickname-availability")
    public ApiResponse<NicknameAvailability> nicknameAvailability(
            @RequestParam @NotBlank @Size(max = 40) String nickname, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(new NicknameAvailability(users.isNicknameAvailable(nickname, jwt == null ? null : userId(jwt))));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
