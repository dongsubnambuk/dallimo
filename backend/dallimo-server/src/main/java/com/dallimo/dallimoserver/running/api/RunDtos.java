package com.dallimo.dallimoserver.running.api;

import com.dallimo.dallimoserver.challenge.api.ChallengeController;
import com.dallimo.dallimoserver.gamification.application.SegmentService;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunMode;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunSource;
import com.dallimo.dallimoserver.running.domain.RunStatus;
import com.dallimo.dallimoserver.running.domain.RunWorkoutStep;
import com.dallimo.dallimoserver.workout.domain.EndConditionType;
import com.dallimo.dallimoserver.workout.domain.StepType;
import com.dallimo.dallimoserver.workout.domain.TargetType;
import com.dallimo.dallimoserver.workout.domain.WorkoutDefinition;
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

    /**
     * 42.1장. liveRoomId는 함께 달리기 방 참가 기록에, challengeId는 내 도전에 이 Run을 잇는다.
     * workout: 인터벌 달리기(mode INTERVAL)에서 달린 인터벌 (123.3장 workout_template_id · workout_version)
     */
    public record CreateRunRequest(
            @NotBlank @Pattern(regexp = UUID_RULE) String clientRunUuid,
            @NotNull RunMode mode,
            Long courseId,
            Long challengeId,
            Long liveRoomId,
            @NotNull OffsetDateTime startedAt,
            @Valid WorkoutLinkDto workout) {
    }

    /** 저장한 인터벌이면 id · 버전, 추천 인터벌처럼 저장하지 않고 달렸으면 이름만 */
    public record WorkoutLinkDto(Long templateId, Integer version, @NotBlank @Size(max = 40) String name) {
    }

    /** 인터벌 달리기 구간 하나: 그때 구간 정의 + 반복 몇 번째 + 실제 거리 · 시간 */
    public record WorkoutStepDto(@NotNull StepType stepType, @NotNull EndConditionType endConditionType, Integer endConditionValue,
                                 TargetType targetType, Integer targetMin, Integer targetMax, Integer repeatIndex, Integer repeatCount,
                                 @NotNull @Min(0) Integer distanceM, @NotNull @Min(0) Integer elapsedSeconds, @NotNull Boolean completed) {

        public RunWorkoutStep toStep() {
            return new RunWorkoutStep(new WorkoutDefinition.Step(stepType, endConditionType, endConditionValue, targetType, targetMin, targetMax),
                    repeatIndex, repeatCount, distanceM, elapsedSeconds, completed);
        }

        static WorkoutStepDto from(RunWorkoutStep s) {
            var d = s.step();
            return new WorkoutStepDto(d.stepType(), d.endConditionType(), d.endConditionValue(), d.targetType(), d.targetMin(), d.targetMax(),
                    s.repeatIndex(), s.repeatCount(), s.distanceM(), s.elapsedSeconds(), s.completed());
        }
    }

    /** 러닝 상세의 인터벌 결과 */
    public record WorkoutResultResponse(Long templateId, Integer version, String name, List<WorkoutStepDto> steps) {
        static WorkoutResultResponse of(Run r, List<RunWorkoutStep> steps) {
            if (r.getWorkoutName() == null) return null;
            return new WorkoutResultResponse(r.getWorkoutTemplateId(), r.getWorkoutVersion(), r.getWorkoutName(), steps.stream().map(WorkoutStepDto::from).toList());
        }
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
    public record FinishRunRequest(@NotNull OffsetDateTime endedAt, @NotNull @Min(0) Integer lastSeq, @Min(0) Integer activeSeconds,
                                   @Size(max = RunWorkoutStep.MAX_STEPS) List<@Valid @NotNull WorkoutStepDto> workoutSteps) {
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

    /**
     * 히스토리 한 줄 (GET /runs). courseName은 코스 러닝일 때, workoutName은 인터벌 달리기일 때, source · sourceDeviceName · importedAt은 가져온 기록일 때(122.3장 Source Badge).
     * previewRoute: 목록 썸네일용으로 줄인 경로 [위도, 경도] 최대 41개. 목록에서만 주고(상세는 path, 여기는 null), 점이 없으면 빈 목록
     */
    public record RunSummaryResponse(long runId, String clientRunUuid, RunMode mode, RunStatus status, Long courseId, String courseName,
                                     Instant startedAt, Instant endedAt, int distanceM, int elapsedSeconds, Integer avgPaceSecPerKm,
                                     String verificationStatus, String workoutName, RunSource source, String sourceDeviceName, Instant importedAt,
                                     List<double[]> previewRoute) {
        static RunSummaryResponse from(Run r, String courseName) {
            return from(r, courseName, null);
        }

        static RunSummaryResponse from(Run r, String courseName, List<double[]> previewRoute) {
            return new RunSummaryResponse(r.getId(), r.getClientRunUuid(), r.getMode(), r.getStatus(), r.getCourseId(), courseName, r.getStartedAt(),
                    r.getEndedAt(), r.getDistanceM(), r.getElapsedSeconds(), r.getAvgPaceSecPerKm(), r.getVerificationStatus(), r.getWorkoutName(),
                    r.getSource(), r.getSourceDeviceName(), r.getImportedAt(), previewRoute);
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
                                       Integer weeklyRankBefore, Integer weeklyRankAfter, RankingService.FriendBest friendBest,
                                       Boolean crownTaken, Boolean legendTaken, Integer legendFinishCount,
                                       List<SegmentService.RunSegmentResult> segments) {
    }

    /** 상세 (GET /runs/{id}): 요약 + 스플릿 + 표시용 경로([위도, 경도]) + 검증(코스 러닝일 때) + 이 Run으로 한 도전(CHL-003) + 인터벌 결과 */
    public record RunDetailResponse(RunSummaryResponse summary, List<RunMetrics.Split> splits, List<double[]> path,
                                    VerificationResponse verification, ChallengeController.ChallengeResponse challenge, WorkoutResultResponse workout) {
    }
}
