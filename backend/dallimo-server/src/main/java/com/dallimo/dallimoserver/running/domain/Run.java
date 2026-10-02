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

    // 1부터 빠짐없이 받은 마지막 GPS seq (결정 로그 70항). 다음 Batch는 여기부터 센다. point는 지우지 않아서 줄지 않는다
    @Column(name = "contiguous_seq", nullable = false)
    private int contiguousSeq;

    // 123.3장: 인터벌 달리기면 달린 인터벌과 그때 버전 (추천 인터벌처럼 저장하지 않은 것이면 id · 버전 없이 이름만)
    @Column(name = "workout_template_id")
    private Long workoutTemplateId;

    @Column(name = "workout_version")
    private Integer workoutVersion;

    @Column(name = "workout_name", length = 40)
    private String workoutName;

    // 122.4장: 어디서 기록했는가. 달리모로 기록했으면 DALLIMO, 가져온 기록이면 원본 정보와 가져온 결과
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RunSource source = RunSource.DALLIMO;

    @Column(name = "source_provider", length = 100)
    private String sourceProvider;

    @Column(name = "provider_activity_id", length = 191)
    private String providerActivityId;

    @Column(name = "source_device_name", length = 100)
    private String sourceDeviceName;

    @Column(name = "imported_at")
    private Instant importedAt;

    @Column(name = "trust_level", nullable = false, length = 10)
    private String trustLevel = RunSource.DALLIMO.trustLevel();

    @Column(name = "verification_policy_version", length = 30)
    private String verificationPolicyVersion;

    @Column(name = "import_status", length = 20)
    private String importStatus;

    @Column(name = "import_failure_reason", length = 200)
    private String importFailureReason;

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

    /** 122.2장: 가져온 기록. 원본 시각으로 만들고 곧바로 끝낸다(finish). courseId는 코스 자동 매칭 결과 */
    public static Run imported(long userId, String clientRunUuid, RunSource source, String sourceProvider, String providerActivityId,
                               String sourceDeviceName, Long courseId, Instant startedAt, Instant now) {
        Run r = start(userId, clientRunUuid, courseId != null ? RunMode.COURSE : RunMode.FREE, courseId, startedAt, now);
        r.source = source;
        r.sourceProvider = sourceProvider;
        r.providerActivityId = providerActivityId;
        r.sourceDeviceName = sourceDeviceName;
        r.importedAt = now;
        r.trustLevel = source.trustLevel();
        r.importStatus = IMPORT_IMPORTED;
        return r;
    }

    public static final String IMPORT_IMPORTED = "IMPORTED";

    /** 가져온 뒤 일부 단계(코스 매칭)가 실패하면 기록은 남기고 사유를 둔다 (122.2장) */
    public void importProblem(String reason, Instant now) {
        this.importFailureReason = reason;
        this.updatedAt = now;
    }

    /** 검증 결과를 남길 때 어떤 정책으로 판정했는지 */
    public void verifiedWith(String policyVersion) {
        this.verificationPolicyVersion = policyVersion;
    }

    /** 인터벌 달리기: 만들 때 한 번 */
    public void linkWorkout(Long templateId, Integer version, String name) {
        this.workoutTemplateId = templateId;
        this.workoutVersion = version;
        this.workoutName = name;
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
        this.verificationStatus = mode.usesCourse() && courseId != null && source.rankable() ? VERIFICATION_PENDING : VERIFICATION_NONE;
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

    public int getContiguousSeq() {
        return contiguousSeq;
    }

    public void advanceContiguousSeq(int seq) {
        if (seq > contiguousSeq) contiguousSeq = seq;
    }

    public RunSource getSource() {
        return source;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }

    public String getProviderActivityId() {
        return providerActivityId;
    }

    public String getSourceDeviceName() {
        return sourceDeviceName;
    }

    public Instant getImportedAt() {
        return importedAt;
    }

    public String getTrustLevel() {
        return trustLevel;
    }

    public String getImportStatus() {
        return importStatus;
    }

    public String getImportFailureReason() {
        return importFailureReason;
    }

    public Long getWorkoutTemplateId() {
        return workoutTemplateId;
    }

    public Integer getWorkoutVersion() {
        return workoutVersion;
    }

    public String getWorkoutName() {
        return workoutName;
    }
}
