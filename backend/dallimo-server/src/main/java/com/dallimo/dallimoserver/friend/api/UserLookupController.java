package com.dallimo.dallimoserver.friend.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.friend.application.FriendService.Profile;
import com.dallimo.dallimoserver.friend.application.FriendService.UserSummary;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 41장 GET /users/search (FND-001) + 다른 사용자 프로필 (FND-005, 명세 표에 경로 없음) */
@RestController
@RequestMapping("/api/v1/users")
public class UserLookupController {

    private final FriendService friends;

    public UserLookupController(FriendService friends) {
        this.friends = friends;
    }

    /** 닉네임 일부 또는 친구 코드. 결과마다 나와의 관계 */
    @GetMapping("/search")
    public ApiResponse<CursorPage<UserSummary>> search(@AuthenticationPrincipal Jwt jwt,
                                                       @RequestParam @Size(min = 1, max = 40) String q,
                                                       @RequestParam(required = false) String cursor,
                                                       @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ApiResponse.ok(friends.search(userId(jwt), q, cursor, size));
    }

    /** 프로필. 코스 기록 · 마지막 러닝은 친구에게만 */
    @GetMapping("/{userId:\\d+}")
    public ApiResponse<Profile> profile(@AuthenticationPrincipal Jwt jwt, @PathVariable long userId) {
        return ApiResponse.ok(friends.profile(userId(jwt), userId));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
