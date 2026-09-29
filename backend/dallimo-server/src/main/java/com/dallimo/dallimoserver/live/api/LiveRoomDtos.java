package com.dallimo.dallimoserver.live.api;

import com.dallimo.dallimoserver.live.application.LiveRoomService.Snapshot;
import com.dallimo.dallimoserver.live.domain.LiveMemberStatus;
import com.dallimo.dallimoserver.live.domain.LiveMode;
import com.dallimo.dallimoserver.live.domain.LiveRoomStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/** 45장 Together 요청 · 응답 */
public final class LiveRoomDtos {

    private LiveRoomDtos() {
    }

    /** 방 만들기. 목표 거리 0.5~50km, 목표 시간 5분~4시간 (명세에 범위 없음) */
    public record CreateRoomRequest(@NotNull LiveMode mode,
                                    @Min(500) @Max(50_000) Integer targetDistanceM,
                                    @Min(300) @Max(14_400) Integer targetSeconds,
                                    Long courseId,
                                    OffsetDateTime scheduledAt) {
    }

    public record JoinRequest(@NotBlank @Size(max = 32) String inviteCode) {
    }

    public record ReadyRequest(Boolean ready) {
    }

    public record CourseRef(long id, String name) {
    }

    public record MemberResponse(long userId, String name, LiveMemberStatus status, boolean isHost, boolean isMe) {
    }

    /**
     * 방 snapshot. 초대 링크로 보는 중이라 아직 참가하지 않았으면 내 줄이 INVITED로 들어간다 (참가 버튼).
     * startsAt: 모두 준비된 뒤 서버가 정한 출발 시각. serverTime: 앱이 카운트다운 시계를 맞출 때
     */
    public record RoomResponse(long id, LiveMode mode, Integer targetDistanceM, Integer targetSeconds, CourseRef course, Instant scheduledAt,
                               LiveRoomStatus status, Instant startsAt, List<MemberResponse> members, Instant serverTime) {
        public static RoomResponse from(Snapshot s, Instant now) {
            var r = s.room();
            List<MemberResponse> list = new ArrayList<>(s.members().stream()
                    .map(m -> new MemberResponse(m.userId(), m.nickname(), m.status(), m.userId() == r.getHostUserId(), m.userId() == s.viewerId()))
                    .toList());
            boolean member = s.members().stream().anyMatch(m -> m.userId() == s.viewerId());
            if (!member && s.viewerId() != 0) list.add(new MemberResponse(s.viewerId(), s.viewerName(), LiveMemberStatus.INVITED, false, true));
            return new RoomResponse(r.getId(), r.getMode(), r.getTargetDistanceM(), r.getTargetSeconds(),
                    r.getCourseId() == null || s.courseName() == null ? null : new CourseRef(r.getCourseId(), s.courseName()),
                    r.getScheduledAt(), r.getStatus(), r.getStartsAt(), list, now);
        }
    }
}
