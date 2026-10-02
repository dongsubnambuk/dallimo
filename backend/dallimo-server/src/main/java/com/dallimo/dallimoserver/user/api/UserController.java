package com.dallimo.dallimoserver.user.api;

import com.dallimo.dallimoserver.auth.application.AuthService;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.running.application.RunService;
import com.dallimo.dallimoserver.running.infrastructure.RunStatsJdbcRepository;
import com.dallimo.dallimoserver.user.application.UserService;
import com.dallimo.dallimoserver.user.domain.RunnerProfile;
import com.dallimo.dallimoserver.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final RunStatsJdbcRepository runStats;
    private final RunService runs;

    public UserController(UserService users, AuthService auth, RunStatsJdbcRepository runStats, RunService runs) {
        this.users = users;
        this.auth = auth;
        this.runStats = runStats;
        this.runs = runs;
    }

    public record UpdateMeRequest(@NotBlank @Size(max = 40) String nickname) {
        public UpdateMeRequest {
            nickname = nickname == null ? null : nickname.trim();
        }
    }

    public record NicknameAvailability(boolean available) {
    }

    /** MY-001~002 내 프로필 + 누적 통계 (끝난 러닝의 수 · 거리 · 달린 시간) + 온보딩 러너 정보 */
    public record MeResponse(long userId, String email, String nickname, String friendCode, RunStatsJdbcRepository.Totals stats,
                             RunnerProfile runnerProfile) {
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal Jwt jwt) {
        User user = users.get(userId(jwt));
        UserResponse u = UserResponse.from(user);
        return ApiResponse.ok(new MeResponse(u.userId(), u.email(), u.nickname(), u.friendCode(), runStats.totals(userId(jwt)),
                user.getRunnerProfile()));
    }

    /**
     * 온보딩 · 설정의 러너 정보 (FOUNDATION-DECISION-LOG 64항). 명세에 없는 API다.
     * 세 값을 통째로 바꾼다. 고르지 않은 값은 null로 보낸다
     */
    @PutMapping("/me/runner-profile")
    public ApiResponse<RunnerProfile> updateRunnerProfile(@AuthenticationPrincipal Jwt jwt, @RequestBody RunnerProfile req) {
        return ApiResponse.ok(users.changeRunnerProfile(userId(jwt), req == null ? RunnerProfile.EMPTY : req));
    }

    /** 명세 41장 PATCH /users/me. 닉네임만 바꾼다 (프로필 사진은 뺐다, 결정 로그 60항) */
    @PatchMapping("/me")
    public ApiResponse<UserResponse> updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest req) {
        return ApiResponse.ok(UserResponse.from(users.changeNickname(userId(jwt), req.nickname())));
    }

    /** 심박 저장 동의를 끄면 저장된 심박을 모두 지운다 (FOUNDATION-DECISION-LOG 65항) */
    @DeleteMapping("/me/heart-rates")
    public ResponseEntity<Void> deleteHeartRates(@AuthenticationPrincipal Jwt jwt) {
        runs.deleteHeartRates(userId(jwt));
        return ResponseEntity.noContent().build();
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
