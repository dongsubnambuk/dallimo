package com.dallimo.dallimoserver.friend.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.friend.application.FriendService.Friend;
import com.dallimo.dallimoserver.friend.application.FriendService.Requests;
import com.dallimo.dallimoserver.friend.application.FriendService.UserSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 44장 Friend API (FND-002~005) */
@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {

    private final FriendService friends;

    public FriendController(FriendService friends) {
        this.friends = friends;
    }

    public record FriendRequestBody(@NotNull @Positive Long userId) {
    }

    /** 친구 요청. 응답은 요청 뒤 관계(상대가 먼저 요청했으면 바로 FRIEND) */
    @PostMapping("/requests")
    public ApiResponse<UserSummary> request(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody FriendRequestBody req) {
        return ApiResponse.ok(friends.request(userId(jwt), req.userId()));
    }

    @GetMapping("/requests")
    public ApiResponse<Requests> requests(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(friends.requests(userId(jwt)));
    }

    @PostMapping("/requests/{requestId}/accept")
    public ApiResponse<UserSummary> accept(@AuthenticationPrincipal Jwt jwt, @PathVariable long requestId) {
        return ApiResponse.ok(friends.accept(userId(jwt), requestId));
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> reject(@AuthenticationPrincipal Jwt jwt, @PathVariable long requestId) {
        friends.reject(userId(jwt), requestId);
        return ResponseEntity.noContent().build();
    }

    /** 친구 삭제. 요청 중이면 보낸 요청 취소 · 받은 요청 거절 */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable long userId) {
        friends.remove(userId(jwt), userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ApiResponse<List<Friend>> list(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(friends.friends(userId(jwt)));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
