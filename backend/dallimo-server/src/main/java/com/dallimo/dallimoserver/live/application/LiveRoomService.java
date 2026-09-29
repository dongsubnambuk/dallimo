package com.dallimo.dallimoserver.live.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.live.domain.LiveMemberStatus;
import com.dallimo.dallimoserver.live.domain.LiveMode;
import com.dallimo.dallimoserver.live.domain.LiveRoom;
import com.dallimo.dallimoserver.live.domain.LiveRoomStatus;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository.Member;
import com.dallimo.dallimoserver.live.infrastructure.LiveRoomJpaRepository;
import com.dallimo.dallimoserver.share.infrastructure.ShareJdbcRepository;
import com.dallimo.dallimoserver.live.domain.LiveRoomEvents;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 45장 함께 달리기 방 (TGT-001~012) 중 대기실: 만들기 · 친구 초대 · 초대 링크로 참가 · 준비 · 나가기 · 취소 · 목록.
 * 방에 들어오려면 참가자(초대받은 친구 포함)이거나 방 초대 링크의 share_code가 있어야 한다 (방 id만으로는 들어올 수 없다).
 * 초대받은 친구는 INVITED 줄로 들어가 목록에 방이 보이고, 참가하면 JOINED. 출발할 때까지 참가하지 않으면 방에서 빠진다.
 * 달리는 중 실시간 상태와 결과는 LiveRaceService.
 */
@Service
public class LiveRoomService {

    // 한 방 최대 인원. 명세에 값 없음
    public static final int MAX_MEMBERS = 10;
    // 달리기 시작한 방을 "예정 · 진행 중" 목록에 남겨 두는 시간 (결과 확정 전까지)
    static final Duration RUNNING_VISIBLE = Duration.ofHours(3);

    private final LiveRoomJpaRepository rooms;
    private final LiveMemberJdbcRepository members;
    private final ShareJdbcRepository shares;
    private final CourseService courses;
    private final FriendService friends;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public LiveRoomService(LiveRoomJpaRepository rooms, LiveMemberJdbcRepository members, ShareJdbcRepository shares, CourseService courses,
                           FriendService friends, Clock clock, ApplicationEventPublisher events) {
        this.rooms = rooms;
        this.members = members;
        this.shares = shares;
        this.courses = courses;
        this.friends = friends;
        this.clock = clock;
        this.events = events;
    }

    /** me: 내 참가 상태. 참가하지 않고 초대 링크로 보는 중이면 INVITED */
    public record Snapshot(LiveRoom room, String courseName, List<Member> members, long viewerId, String viewerName, LiveMemberStatus me) {
    }

    @Transactional
    public Snapshot create(long userId, LiveMode mode, Integer targetDistanceM, Integer targetSeconds, Long courseId, Instant scheduledAt) {
        if (courseId != null) courses.requireViewable(userId, courseId);
        Instant now = clock.instant();
        LiveRoom room = rooms.save(LiveRoom.create(userId, mode, targetDistanceM, targetSeconds, courseId, scheduledAt, now));
        members.add(room.getId(), userId, LiveMemberStatus.JOINED, now);
        return snapshot(room, userId);
    }

    /** 참가자이거나 초대 코드가 맞아야 본다. 보면서 방 상태를 다시 정한다 */
    @Transactional
    public Snapshot get(long userId, long roomId, String inviteCode) {
        LiveRoom room = lock(roomId);
        if (memberOf(room, userId) == null) requireInvite(room, inviteCode);
        return advanceAndSnapshot(room, userId);
    }

    /**
     * 참가: 초대받은 친구는 코드 없이, 아니면 초대 링크 코드로. 이미 참가했으면 그대로.
     * 시작한 방 · 가득 찬 방은 들어올 수 없다 (45.1장 RUNNING 이후 참가 불허). 초대받은 자리는 이미 인원에 들어 있다
     */
    @Transactional
    public Snapshot join(long userId, long roomId, String inviteCode) {
        LiveRoom room = lock(roomId);
        Member me = memberOf(room, userId);
        if (me == null) {
            requireInvite(room, inviteCode);
            if (!room.getStatus().beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 시작했거나 끝난 방이에요.");
            if (members.list(roomId).size() >= MAX_MEMBERS) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "방이 가득 찼어요.");
            members.add(roomId, userId, LiveMemberStatus.JOINED, clock.instant());
        } else if (me.status() == LiveMemberStatus.INVITED) {
            if (!room.getStatus().beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 시작했거나 끝난 방이에요.");
            members.setStatus(roomId, userId, LiveMemberStatus.JOINED);
        }
        return advanceAndSnapshot(room, userId);
    }

    /** TGT-002 친구 초대: 참가자가 자기 친구를 부른다. 이미 방에 있는 사람은 건너뛴다. 시작 전 · 인원 안에서만 */
    @Transactional
    public Snapshot invite(long userId, long roomId, List<Long> userIds) {
        LiveRoom room = lock(roomId);
        Member me = requireMember(room, userId);
        if (me.status() == LiveMemberStatus.INVITED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "먼저 방에 참가해 주세요.");
        if (!room.getStatus().beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 시작했거나 끝난 방이에요.");
        List<Long> in = members.list(roomId).stream().map(Member::userId).toList();
        List<Long> fresh = userIds.stream().distinct().filter(id -> id != userId && !in.contains(id)).toList();
        List<Long> mine = friends.friendIds(userId);
        if (!mine.containsAll(fresh)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "친구만 초대할 수 있어요.");
        if (in.size() + fresh.size() > MAX_MEMBERS) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "방이 가득 찼어요.");
        Instant now = clock.instant();
        for (Long id : fresh) members.add(roomId, id, LiveMemberStatus.INVITED, now);
        return advanceAndSnapshot(room, userId);
    }

    /** READY 전환 · 준비 취소 (시작 전만) */
    @Transactional
    public Snapshot ready(long userId, long roomId, boolean ready) {
        LiveRoom room = lock(roomId);
        Member me = requireMember(room, userId);
        if (!room.getStatus().beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 시작했거나 끝난 방이에요.");
        if (me.status() != LiveMemberStatus.JOINED && me.status() != LiveMemberStatus.READY) throw new ApiException(ErrorCode.RUN_INVALID_STATE);
        members.setStatus(roomId, userId, ready ? LiveMemberStatus.READY : LiveMemberStatus.JOINED);
        return advanceAndSnapshot(room, userId);
    }

    /** 참가자 나가기: 시작 전이면 방에서 빠지고(초대 거절 포함), 달리는 중이면 DNF. 방장은 취소를 쓴다 */
    @Transactional
    public void leave(long userId, long roomId) {
        LiveRoom room = lock(roomId);
        requireMember(room, userId);
        if (room.getHostUserId() == userId && room.getStatus().beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "방장은 방을 취소해 주세요.");
        advance(room);
        if (room.getStatus().beforeStart()) members.remove(roomId, userId);
        else if (room.getStatus() == LiveRoomStatus.RUNNING) {
            members.setStatus(roomId, userId, LiveMemberStatus.DNF);
            events.publishEvent(new LiveRoomEvents.Left(roomId, userId));
        }
        advance(room);
    }

    @Transactional
    public void cancel(long userId, long roomId) {
        LiveRoom room = lock(roomId);
        requireMember(room, userId);
        if (room.getHostUserId() != userId) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "방장만 취소할 수 있어요.");
        advance(room);
        room.cancel(clock.instant());
    }

    /** 내가 참가했거나 초대받은 예정 · 진행 중 방 (예약 시각 순, 예약 없으면 앞) */
    @Transactional
    public List<Snapshot> upcoming(long userId) {
        Instant now = clock.instant();
        List<Snapshot> out = new ArrayList<>();
        for (Long id : members.roomsOf(userId)) {
            LiveRoom room = lock(id);
            Snapshot s = advanceAndSnapshot(room, userId);
            boolean visible = room.getStatus().beforeStart()
                    || (room.getStatus() == LiveRoomStatus.RUNNING && room.getStartedAt() != null && room.getStartedAt().isAfter(now.minus(RUNNING_VISIBLE)));
            if (visible) out.add(s);
        }
        out.sort(Comparator.comparing((Snapshot s) -> s.room().getScheduledAt() == null ? Instant.EPOCH : s.room().getScheduledAt()));
        return out;
    }

    /** 방 멤버인가 (초대 링크 만들기 권한) */
    @Transactional(readOnly = true)
    public boolean isMember(long userId, long roomId) {
        return rooms.findById(roomId).map(r -> memberOf(r, userId) != null).orElse(false);
    }

    @Transactional(readOnly = true)
    public Snapshot preview(long roomId) {
        LiveRoom room = rooms.findById(roomId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요."));
        return snapshot(room, 0);
    }

    private Snapshot advanceAndSnapshot(LiveRoom room, long viewerId) {
        advance(room);
        return snapshot(room, viewerId);
    }

    private void advance(LiveRoom room) {
        List<LiveMemberStatus> statuses = members.list(room.getId()).stream().map(Member::status).toList();
        if (room.advance(statuses, clock.instant())) {
            members.startAll(room.getId());
            // 출발할 때까지 참가하지 않은 초대는 끝난다 (결과에 들어가지 않게)
            members.removeInvited(room.getId());
            // 커밋 뒤 실시간 채널이 참가자 상태를 만들고 알린다
            events.publishEvent(new LiveRoomEvents.Started(room.getId()));
        }
    }

    /** 아무도 방을 읽지 않아도 출발 시각이 지나면 출발시킨다 (실시간 채널의 주기 확인) */
    @Transactional
    public void tick(long roomId) {
        rooms.findForUpdate(roomId).ifPresent(this::advance);
    }

    private Snapshot snapshot(LiveRoom room, long viewerId) {
        List<Member> list = members.list(room.getId());
        Member me = list.stream().filter(m -> m.userId() == viewerId).findFirst().orElse(null);
        String courseName = null;
        if (room.getCourseId() != null) {
            try {
                Course c = courses.requireViewable(viewerId == 0 ? null : viewerId, room.getCourseId());
                courseName = c.getName();
            } catch (ApiException hidden) {
                courseName = null;
            }
        }
        String viewerName = me != null ? me.nickname() : viewerId == 0 ? "" : members.nickname(viewerId);
        return new Snapshot(room, courseName, list, viewerId, viewerName, me == null ? LiveMemberStatus.INVITED : me.status());
    }

    private LiveRoom lock(long roomId) {
        return rooms.findForUpdate(roomId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요."));
    }

    private Member memberOf(LiveRoom room, long userId) {
        return members.list(room.getId()).stream().filter(m -> m.userId() == userId).findFirst().orElse(null);
    }

    private Member requireMember(LiveRoom room, long userId) {
        Member m = memberOf(room, userId);
        if (m == null) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "이 방에 참가하지 않았어요.");
        return m;
    }

    /** 방 id만 알아서는 볼 수 없다. 초대 링크 코드가 이 방 것이어야 한다 (없거나 틀리면 방이 없는 것과 같게 404) */
    private void requireInvite(LiveRoom room, String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank() || !shares.isRoomInvite(inviteCode, room.getId())) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요.");
        }
    }
}
