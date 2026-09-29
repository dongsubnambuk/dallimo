package com.dallimo.dallimoserver.live.api;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.CreateRoomRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.JoinRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.ReadyRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.RoomResponse;
import com.dallimo.dallimoserver.live.application.LiveRoomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.List;

/**
 * 45장 Together REST (대기실까지). 친구 초대(POST /invite)는 친구 기능(WBS 8) 뒤, 결과(GET /result)는 Live 단계(WBS 11) 뒤.
 * 지금은 방 초대 링크(POST /shares type LIVE_ROOM)를 받은 사람이 그 코드로 참가한다.
 */
@RestController
@RequestMapping("/api/v1/live-runs")
public class LiveRoomController {

    private final LiveRoomService rooms;
    private final Clock clock;

    public LiveRoomController(LiveRoomService rooms, Clock clock) {
        this.rooms = rooms;
        this.clock = clock;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoomResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRoomRequest req) {
        var s = rooms.create(userId(jwt), req.mode(), req.targetDistanceM(), req.targetSeconds(), req.courseId(),
                req.scheduledAt() == null ? null : req.scheduledAt().toInstant());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(RoomResponse.from(s, clock.instant())));
    }

    /** 내가 참가한 예정 · 진행 중 방 (SCR-T01). 41~45장 표에 경로가 없어 정했다 */
    @GetMapping
    public ApiResponse<List<RoomResponse>> mine(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(rooms.upcoming(userId(jwt)).stream().map(s -> RoomResponse.from(s, clock.instant())).toList());
    }

    @GetMapping("/{roomId}")
    public ApiResponse<RoomResponse> get(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @RequestParam(required = false) String inviteCode) {
        return ApiResponse.ok(RoomResponse.from(rooms.get(userId(jwt), roomId, inviteCode), clock.instant()));
    }

    @PostMapping("/{roomId}/join")
    public ApiResponse<RoomResponse> join(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @Valid @RequestBody JoinRequest req) {
        return ApiResponse.ok(RoomResponse.from(rooms.join(userId(jwt), roomId, req.inviteCode()), clock.instant()));
    }

    @PostMapping("/{roomId}/ready")
    public ApiResponse<RoomResponse> ready(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @RequestBody(required = false) ReadyRequest req) {
        boolean ready = req == null || req.ready() == null || req.ready();
        return ApiResponse.ok(RoomResponse.from(rooms.ready(userId(jwt), roomId, ready), clock.instant()));
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<Void> leave(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId) {
        rooms.leave(userId(jwt), roomId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{roomId}/cancel")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId) {
        rooms.cancel(userId(jwt), roomId);
        return ResponseEntity.noContent().build();
    }

    /** 최종 결과는 실시간 경쟁(WBS 11)이 확정한다. 그 전까지는 없음 */
    @GetMapping("/{roomId}/result")
    public ApiResponse<Void> result(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId) {
        throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "결과가 아직 없어요.");
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
