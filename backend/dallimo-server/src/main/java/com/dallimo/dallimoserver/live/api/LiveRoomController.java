package com.dallimo.dallimoserver.live.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.CreateRoomRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.InviteRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.JoinRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.ReadyRequest;
import com.dallimo.dallimoserver.live.api.LiveRoomDtos.RoomResponse;
import com.dallimo.dallimoserver.live.application.LiveRaceService;
import com.dallimo.dallimoserver.live.application.LiveRoomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
 * 45장 Together REST. 달리는 중 상태는 STOMP(LiveRaceMessageController). 친구 초대(POST /invite)는 친구 기능(WBS 8) 뒤.
 * 지금은 방 초대 링크(POST /shares type LIVE_ROOM)를 받은 사람이 그 코드로 참가한다.
 */
@RestController
@RequestMapping("/api/v1/live-runs")
public class LiveRoomController {

    private final LiveRoomService rooms;
    private final LiveRaceService race;
    private final Clock clock;

    public LiveRoomController(LiveRoomService rooms, LiveRaceService race, Clock clock) {
        this.rooms = rooms;
        this.race = race;
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

    /** SCR-T01 최근 결과: 내가 참가한 끝난 방. 41~45장 표에 경로가 없어 정했다 */
    @GetMapping("/recent")
    public ApiResponse<List<LiveRaceService.RecentResult>> recent(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "10") @Min(1) @Max(30) int size) {
        return ApiResponse.ok(race.recent(userId(jwt), size));
    }

    @GetMapping("/{roomId}")
    public ApiResponse<RoomResponse> get(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @RequestParam(required = false) String inviteCode) {
        return ApiResponse.ok(RoomResponse.from(rooms.get(userId(jwt), roomId, inviteCode), clock.instant()));
    }

    /** TGT-002 친구 초대 */
    @PostMapping("/{roomId}/invite")
    public ApiResponse<RoomResponse> invite(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @Valid @RequestBody InviteRequest req) {
        return ApiResponse.ok(RoomResponse.from(rooms.invite(userId(jwt), roomId, req.userIds()), clock.instant()));
    }

    /** 초대받은 친구는 본문 없이, 초대 링크로 온 사람은 inviteCode와 함께 */
    @PostMapping("/{roomId}/join")
    public ApiResponse<RoomResponse> join(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId, @Valid @RequestBody(required = false) JoinRequest req) {
        return ApiResponse.ok(RoomResponse.from(rooms.join(userId(jwt), roomId, req == null ? null : req.inviteCode()), clock.instant()));
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

    /** SCR-T05 최종 결과 (46.1장 서버 finalization 값). 참가자만, 방이 끝나기 전에는 404 */
    @GetMapping("/{roomId}/result")
    public ApiResponse<LiveRaceService.Result> result(@AuthenticationPrincipal Jwt jwt, @PathVariable long roomId) {
        return ApiResponse.ok(race.result(userId(jwt), roomId));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
