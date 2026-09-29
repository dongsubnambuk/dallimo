package com.dallimo.dallimoserver.running.api;

import com.dallimo.dallimoserver.ranking.application.RankingService;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunMode;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/** 42장 Run API 요청 · 응답 */
public final class RunDtos {

    private RunDtos() {
    }

    static final String UUID_RULE = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    /** 42.1장. liveRoomId는 함께 달리기 방 참가 기록에 이 Run을 잇는다. challengeId는 도전(WBS 9) 전이라 받기만 한다 */
    public record CreateRunRequest(
            @NotBlank @Pattern(regexp = UUID_RULE) String clientRunUuid,
            @NotNull RunMode mode,
            Long courseId,
            Long challengeId,
            Long liveRoomId,
            @NotNull OffsetDateTime startedAt) {
    }

    public record CreateRunResponse(long runId, String clientRunUuid, RunStatus status, Instant serverTime) {
    }

    public record PointDto(
            @NotNull @Min(1) Integer seq,
            @NotNull Double latitude,
            @NotNull Double longitude,
            Double altitudeM,
            Double accuracyM,
            Double speedMps,
            @NotNull OffsetDateTime recordedAt) {

        RunPoint toPoint() {
            return new RunPoint(seq, latitude, longitude, altitudeM, accuracyM, speedMps, recordedAt.toInstant());
        }
    }

    /** 42.2장 */
    public record PointBatchRequest(
            @NotBlank @Pattern(regexp = UUID_RULE) String batchUuid,
            @NotNull @Min(1) Integer fromSeq,
            @NotNull @Min(1) Integer toSeq,
            @NotEmpty @Size(max = 500) List<@Valid @NotNull PointDto> points) {
    }

    public record PointBatchResponse(String batchUuid, boolean accepted, int lastAcceptedSeq) {
    }

    /**
     * 42.4장 + activeSeconds: 앱이 계산한 달린 시간(일시정지 제외). 사용자 결정으로 더했다(오프라인 일시정지 시각을 서버가 알 수 없어서).
     */
    public record FinishRunRequest(@NotNull OffsetDateTime endedAt, @NotNull @Min(0) Integer lastSeq, @Min(0) Integer activeSeconds) {
    }

    public record FinishRunResponse(long runId, RunStatus status, int distanceM, int elapsedSeconds, Integer avgPaceSecPerKm, String verificationStatus) {
        static FinishRunResponse from(Run r) {
            boolean done = r.getStatus() == RunStatus.FINISHED;
            return new FinishRunResponse(r.getId(), r.getStatus(), done ? r.getDistanceM() : 0, done ? r.getElapsedSeconds() : 0,
                    done ? r.getAvgPaceSecPerKm() : null, r.getVerificationStatus());
        }
    }

    public record RunStatusResponse(long runId, RunStatus status, Instant at) {
    }

    /** 히스토리 한 줄 (GET /runs). courseName은 코스 러닝일 때 */
    public record RunSummaryResponse(long runId, String clientRunUuid, RunMode mode, RunStatus status, Long courseId, String courseName,
                                     Instant startedAt, Instant endedAt, int distanceM, int elapsedSeconds, Integer avgPaceSecPerKm,
                                     String verificationStatus) {
        static RunSummaryResponse from(Run r, String courseName) {
            return new RunSummaryResponse(r.getId(), r.getClientRunUuid(), r.getMode(), r.getStatus(), r.getCourseId(), courseName, r.getStartedAt(),
                    r.getEndedAt(), r.getDistanceM(), r.getElapsedSeconds(), r.getAvgPaceSecPerKm(), r.getVerificationStatus());
        }
    }

    /**
     * 코스 완주 검증 결과 (CRUN-005, RST-002). 판정 전(PENDING)이면 status만 있다.
     * recordSeconds: 공식 기록(VERIFIED일 때), previousBestSec: 이 기록 전 내 최고 기록, personalBest: 이 기록이 PB인가
     * weeklyRankBefore · After: 기록한 주의 주간 순위, 이 기록 전(그 주 기록이 없었으면 null) → 후 (RST-003)
     * friendBest: 이 코스 친구 최고 기록 (RST-004 친구 비교, 없으면 null)
     */
    public record VerificationResponse(String status, String failureReason, Double matchRate, Integer recordSeconds,
                                       Integer previousBestSec, Boolean personalBest, String policyVersion,
                                       Integer weeklyRankBefore, Integer weeklyRankAfter, RankingService.FriendBest friendBest) {
    }

    /** 상세 (GET /runs/{id}): 요약 + 스플릿 + 표시용 경로([위도, 경도]) + 검증(코스 러닝일 때) */
    public record RunDetailResponse(RunSummaryResponse summary, List<RunMetrics.Split> splits, List<double[]> path,
                                    VerificationResponse verification) {
    }
}
