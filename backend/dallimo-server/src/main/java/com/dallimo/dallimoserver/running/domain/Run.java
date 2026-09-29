package com.dallimo.dallimoserver.running.domain;

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

import java.time.Instant;

/**
 * tbl_run (22.4장). RunPoint는 ORM 컬렉션으로 들지 않고 JDBC로 따로 쓴다 (22.1장, ADR-003).
 */
@Entity
@Table(name = "tbl_run")
public class Run {

    public static final String VERIFICATION_NONE = "NONE";
    public static final String VERIFICATION_PENDING = "PENDING";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "client_run_uuid", nullable = false, length = 36)
    private String clientRunUuid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RunMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RunStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "elapsed_seconds", nullable = false)
    private int elapsedSeconds;

    @Column(name = "distance_m", nullable = false)
    private int distanceM;

    @Column(name = "avg_pace_sec_per_km")
    private Integer avgPaceSecPerKm;

    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Run() {
    }

    public static Run start(long userId, String clientRunUuid, RunMode mode, Long courseId, Instant startedAt, Instant now) {
        Run r = new Run();
        r.userId = userId;
        r.clientRunUuid = clientRunUuid;
        r.mode = mode;
        r.courseId = courseId;
        r.status = RunStatus.RUNNING;
        r.startedAt = startedAt;
        r.verificationStatus = VERIFICATION_NONE;
        r.createdAt = now;
        r.updatedAt = now;
        return r;
    }

    /** 27.2장: RUNNING일 때만 */
    public void pause(Instant now) {
        if (status != RunStatus.RUNNING) throw invalidState();
        status = RunStatus.PAUSED;
        updatedAt = now;
    }

    /** 27.2장: PAUSED일 때만 */
    public void resume(Instant now) {
        if (status != RunStatus.PAUSED) throw invalidState();
        status = RunStatus.RUNNING;
        updatedAt = now;
    }

    /** 42.4장: 빠진 point가 있으면 확정하지 않고 FINISHING으로 둔다 */
    public void markFinishing(Instant now) {
        if (status == RunStatus.FINISHED || status == RunStatus.CANCELED) throw invalidState();
        status = RunStatus.FINISHING;
        updatedAt = now;
    }

    public void finish(Instant endedAt, int elapsedSeconds, int distanceM, Integer avgPaceSecPerKm, Instant now) {
        if (status == RunStatus.FINISHED || status == RunStatus.CANCELED) throw invalidState();
        this.status = RunStatus.FINISHED;
        this.endedAt = endedAt;
        this.elapsedSeconds = elapsedSeconds;
        this.distanceM = distanceM;
        this.avgPaceSecPerKm = avgPaceSecPerKm;
        // 25.3장: 코스 러닝이면 완주 검증 대기. 검증은 커밋 뒤 따로 돈다 (verification 패키지)
        this.verificationStatus = mode.usesCourse() && courseId != null ? VERIFICATION_PENDING : VERIFICATION_NONE;
        this.updatedAt = now;
    }

    /** 26장 검증 결과 (VERIFIED · UNVERIFIED · REJECTED). 검증 대기일 때만 바꾼다 */
    public boolean completeVerification(String outcome, Instant now) {
        if (!VERIFICATION_PENDING.equals(verificationStatus)) return false;
        this.verificationStatus = outcome;
        this.updatedAt = now;
        return true;
    }

    public boolean awaitingVerification() {
        return status == RunStatus.FINISHED && VERIFICATION_PENDING.equals(verificationStatus);
    }

    private static ApiException invalidState() {
        return new ApiException(ErrorCode.RUN_INVALID_STATE);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public String getClientRunUuid() {
        return clientRunUuid;
    }

    public RunMode getMode() {
        return mode;
    }

    public RunStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public int getElapsedSeconds() {
        return elapsedSeconds;
    }

    public int getDistanceM() {
        return distanceM;
    }

    public Integer getAvgPaceSecPerKm() {
        return avgPaceSecPerKm;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }
}
