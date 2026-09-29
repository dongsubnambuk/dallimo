package com.dallimo.dallimoserver.running.api;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.running.api.RunDtos.CreateRunRequest;
import com.dallimo.dallimoserver.running.api.RunDtos.CreateRunResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.FinishRunRequest;
import com.dallimo.dallimoserver.running.api.RunDtos.FinishRunResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.PointBatchRequest;
import com.dallimo.dallimoserver.running.api.RunDtos.PointBatchResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.PointDto;
import com.dallimo.dallimoserver.running.api.RunDtos.RunDetailResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.RunStatusResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.RunSummaryResponse;
import com.dallimo.dallimoserver.running.api.RunDtos.VerificationResponse;
import com.dallimo.dallimoserver.running.application.RunService;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.verification.application.CourseVerificationService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.List;
import java.util.Map;

/** 42장 Run API */
@RestController
@RequestMapping("/api/v1/runs")
public class RunController {

    private final RunService runs;
    private final CourseVerificationService verification;
    private final Clock clock;

    public RunController(RunService runs, CourseVerificationService verification, Clock clock) {
        this.runs = runs;
        this.verification = verification;
        this.clock = clock;
    }

    /** 42.1장: 새로 만들면 201, 같은 clientRunUuid 재요청이면 200 */
    @PostMapping
    public ResponseEntity<ApiResponse<CreateRunResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRunRequest req) {
        RunService.Created c = runs.create(userId(jwt), req.clientRunUuid().toLowerCase(), req.mode(), req.courseId(), req.startedAt().toInstant());
        Run r = c.run();
        return ResponseEntity.status(c.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(ApiResponse.ok(new CreateRunResponse(r.getId(), r.getClientRunUuid(), r.getStatus(), clock.instant())));
    }

    /** 42.2장 · 7.3장: Idempotency-Key 헤더가 있으면 batchUuid와 같아야 한다 */
    @PostMapping("/{runId}/points")
    public ApiResponse<PointBatchResponse> points(@AuthenticationPrincipal Jwt jwt, @PathVariable long runId,
                                                  @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
                                                  @Valid @RequestBody PointBatchRequest req) {
        if (idempotencyKey != null && !idempotencyKey.equalsIgnoreCase(req.batchUuid())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Idempotency-Key와 batchUuid가 달라요.");
        }
        RunService.BatchResult r = runs.uploadPoints(userId(jwt), runId, req.batchUuid().toLowerCase(), req.fromSeq(), req.toSeq(),
                req.points().stream().map(PointDto::toPoint).toList());
        return ApiResponse.ok(new PointBatchResponse(r.batchUuid(), r.accepted(), r.lastAcceptedSeq()));
    }

    @PostMapping("/{runId}/pause")
    public ApiResponse<RunStatusResponse> pause(@AuthenticationPrincipal Jwt jwt, @PathVariable long runId) {
        Run r = runs.pause(userId(jwt), runId);
        return ApiResponse.ok(new RunStatusResponse(r.getId(), r.getStatus(), clock.instant()));
    }

    @PostMapping("/{runId}/resume")
    public ApiResponse<RunStatusResponse> resume(@AuthenticationPrincipal Jwt jwt, @PathVariable long runId) {
        Run r = runs.resume(userId(jwt), runId);
        return ApiResponse.ok(new RunStatusResponse(r.getId(), r.getStatus(), clock.instant()));
    }

    /** 42.4장: 빠진 point가 있으면 status FINISHING (200), 다 있으면 FINISHED */
    @PostMapping("/{runId}/finish")
    public ApiResponse<FinishRunResponse> finish(@AuthenticationPrincipal Jwt jwt, @PathVariable long runId, @Valid @RequestBody FinishRunRequest req) {
        Run r = runs.finish(userId(jwt), runId, req.endedAt().toInstant(), req.lastSeq(), req.activeSeconds()).run();
        return ApiResponse.ok(FinishRunResponse.from(r));
    }

    @GetMapping
    public ApiResponse<CursorPage<RunSummaryResponse>> list(@AuthenticationPrincipal Jwt jwt,
                                                            @RequestParam(required = false) String cursor,
                                                            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        CursorPage<Run> page = runs.list(userId(jwt), cursor, size);
        Map<Long, String> names = runs.courseNames(page.items());
        return ApiResponse.ok(new CursorPage<>(page.items().stream().map(r -> RunSummaryResponse.from(r, names.get(r.getCourseId()))).toList(),
                page.nextCursor(), page.hasNext()));
    }

    @GetMapping("/{runId}")
    public ApiResponse<RunDetailResponse> detail(@AuthenticationPrincipal Jwt jwt, @PathVariable long runId) {
        RunService.Detail d = runs.detail(userId(jwt), runId);
        Run r = d.run();
        return ApiResponse.ok(new RunDetailResponse(RunSummaryResponse.from(r, runs.courseNames(List.of(r)).get(r.getCourseId())),
                d.metrics().splits(), d.metrics().path(), verificationOf(r)));
    }

    /** 코스 러닝이 아니면 null. 판정 전이면 상태만 */
    private VerificationResponse verificationOf(Run r) {
        if (Run.VERIFICATION_NONE.equals(r.getVerificationStatus())) return null;
        return verification.summary(r.getId())
                .map(v -> new VerificationResponse(r.getVerificationStatus(), v.failureReason(), v.matchRate(), v.recordSeconds(), v.previousBestSec(),
                        v.recordSeconds() == null ? null : v.previousBestSec() == null || v.recordSeconds() < v.previousBestSec(), v.policyVersion()))
                .orElse(new VerificationResponse(r.getVerificationStatus(), null, null, null, null, null, null));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
