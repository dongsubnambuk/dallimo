package com.dallimo.dallimoserver.live.domain;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * tbl_live_run_room (20장 ERD live_run_room). 방 상태 전이는 서버가 정한다 (45.1장):
 * 참가자 2명 이상이 모두 준비되고 예약 시각이 되면 출발 시각(startsAt)을 잡고 READY, 그 시각이 지나면 RUNNING.
 * 출발 전 누군가 준비를 풀면 다시 WAITING.
 */
@Entity
@Table(name = "tbl_live_run_room")
public class LiveRoom {

    // 모두 준비된 뒤 출발까지 (대기실 카운트다운). 명세에 값 없음
    public static final Duration START_DELAY = Duration.ofSeconds(5);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_user_id", nullable = false)
    private Long hostUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LiveMode mode;

    @Column(name = "target_distance_m")
    private Integer targetDistanceM;

    @Column(name = "target_seconds")
    private Integer targetSeconds;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LiveRoomStatus status;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected LiveRoom() {
    }

    public static LiveRoom create(long hostUserId, LiveMode mode, Integer targetDistanceM, Integer targetSeconds, Long courseId, Instant scheduledAt, Instant now) {
        // 45.1장 invariant
        if (mode == LiveMode.LIVE_RACE && (targetDistanceM == null || targetSeconds != null)) throw invalid("레이스는 목표 거리만 정해요.");
        if (mode == LiveMode.TIME_ATTACK && (targetSeconds == null || targetDistanceM != null)) throw invalid("타임 어택은 목표 시간만 정해요.");
        if (mode == LiveMode.TOGETHER && targetDistanceM == null && targetSeconds == null) throw invalid("함께 달릴 거리나 시간을 정해 주세요.");
        if (scheduledAt != null && scheduledAt.isBefore(now.minusSeconds(60))) throw invalid("출발 시각이 지났어요.");
        LiveRoom r = new LiveRoom();
        r.hostUserId = hostUserId;
        r.mode = mode;
        r.targetDistanceM = targetDistanceM;
        r.targetSeconds = targetSeconds;
        r.courseId = courseId;
        r.scheduledAt = scheduledAt;
        r.status = LiveRoomStatus.WAITING;
        r.createdAt = now;
        r.updatedAt = now;
        return r;
    }

    /** 참가자 상태로 방 상태를 다시 정한다. 방이 막 달리기 시작했으면 true */
    public boolean advance(List<LiveMemberStatus> members, Instant now) {
        if (!status.beforeStart()) return false;
        List<LiveMemberStatus> joined = members.stream().filter(s -> s != LiveMemberStatus.INVITED).toList();
        boolean allReady = joined.size() >= 2 && joined.stream().allMatch(s -> s == LiveMemberStatus.READY);
        boolean timeOk = scheduledAt == null || !now.isBefore(scheduledAt);
        if (allReady && timeOk) {
            if (startsAt == null) {
                startsAt = now.plus(START_DELAY);
                status = LiveRoomStatus.READY;
                updatedAt = now;
            }
            if (!now.isBefore(startsAt)) {
                status = LiveRoomStatus.RUNNING;
                startedAt = startsAt;
                updatedAt = now;
                return true;
            }
        } else if (status != LiveRoomStatus.WAITING || startsAt != null) {
            status = LiveRoomStatus.WAITING;
            startsAt = null;
            updatedAt = now;
        }
        return false;
    }

    /** 방장이 시작 전에 취소 */
    public void cancel(Instant now) {
        if (!status.beforeStart()) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 시작했거나 끝난 방은 취소할 수 없어요.");
        status = LiveRoomStatus.CANCELED;
        startsAt = null;
        updatedAt = now;
    }

    /** 모두 끝났거나 마감 시각이 지나 서버가 결과를 확정했다 */
    public void finish(Instant now) {
        if (status != LiveRoomStatus.RUNNING) return;
        status = LiveRoomStatus.FINISHED;
        endedAt = now;
        updatedAt = now;
    }

    /** 목표가 거리인가 (레이스 · 거리 함께). 아니면 시간 (타임 어택 · 시간 함께) */
    public boolean distanceGoal() {
        return targetDistanceM != null;
    }

    private static ApiException invalid(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }

    public Long getId() {
        return id;
    }

    public Long getHostUserId() {
        return hostUserId;
    }

    public LiveMode getMode() {
        return mode;
    }

    public Integer getTargetDistanceM() {
        return targetDistanceM;
    }

    public Integer getTargetSeconds() {
        return targetSeconds;
    }

    public Long getCourseId() {
        return courseId;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public LiveRoomStatus getStatus() {
        return status;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** 알림 문구용 목표. 앱 goalLabel과 같은 말: "5km 레이스", "30분 타임 어택", "함께 3km" */
    public String goalLabel() {
        String goal = targetSeconds != null ? Math.round(targetSeconds / 60.0) + "분"
                : java.math.BigDecimal.valueOf(targetDistanceM == null ? 0 : targetDistanceM, 3).stripTrailingZeros().toPlainString() + "km";
        return switch (mode) {
            case LIVE_RACE -> goal + " 레이스";
            case TIME_ATTACK -> goal + " 타임 어택";
            case TOGETHER -> "함께 " + goal;
        };
    }
}
