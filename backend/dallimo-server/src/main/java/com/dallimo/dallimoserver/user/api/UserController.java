package com.dallimo.dallimoserver.user.api;

import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.running.infrastructure.RunStatsJdbcRepository;
import com.dallimo.dallimoserver.user.application.ProfileService;
import com.dallimo.dallimoserver.user.application.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;

/** 명세 41장 사용자 API (+ 닉네임 확인 · 탈퇴) */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService users;
    private final AuthService auth;
    private final RunStatsJdbcRepository runStats;
    private final ProfileService profiles;

    public UserController(UserService users, AuthService auth, RunStatsJdbcRepository runStats, ProfileService profiles) {
        this.users = users;
        this.auth = auth;
        this.runStats = runStats;
        this.profiles = profiles;
    }

    public record UpdateMeRequest(@NotBlank @Size(max = 40) String nickname) {
        public UpdateMeRequest {
            nickname = nickname == null ? null : nickname.trim();
        }
    }

    public record NicknameAvailability(boolean available) {
    }

    /** MY-001~002 내 프로필 + 누적 통계 (끝난 러닝의 수 · 거리 · 달린 시간) */
    public record MeResponse(long userId, String email, String nickname, String profileImageUrl, String friendCode, RunStatsJdbcRepository.Totals stats) {
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal Jwt jwt) {
        UserResponse u = UserResponse.from(users.get(userId(jwt)));
        return ApiResponse.ok(new MeResponse(u.userId(), u.email(), u.nickname(), u.profileImageUrl(), u.friendCode(), runStats.totals(userId(jwt))));
    }

    /** 닉네임 변경 (JSON) */
    @PatchMapping(path = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UserResponse> updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest req) {
        return ApiResponse.ok(UserResponse.from(users.changeNickname(userId(jwt), req.nickname())));
    }

    /**
     * 명세 41장 PATCH /users/me (nickname?, profileImage?)를 multipart로. 사진은 JPG · PNG 5MB까지,
     * 서버가 가운데를 정사각형 512px JPEG로 다시 만든다(EXIF · 위치 정보는 남지 않는다)
     */
    @PatchMapping(path = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> updateMeWithImage(@AuthenticationPrincipal Jwt jwt,
                                                       @RequestParam(required = false) @Size(max = 40) String nickname,
                                                       @RequestPart(name = "profileImage", required = false) MultipartFile profileImage) throws IOException {
        String n = nickname == null || nickname.isBlank() ? null : nickname.trim();
        byte[] image = profileImage == null || profileImage.isEmpty() ? null : profileImage.getBytes();
        return ApiResponse.ok(UserResponse.from(profiles.update(userId(jwt), n, image, ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString())));
    }

    /** 프로필 사진 빼기 (명세에 없음, 닉네임 첫 글자로 돌아간다) */
    @DeleteMapping("/me/profile-image")
    public ApiResponse<UserResponse> removeImage(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(UserResponse.from(profiles.removeImage(userId(jwt))));
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
