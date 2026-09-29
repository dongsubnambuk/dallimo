package com.dallimo.dallimoserver.challenge.api;

import com.dallimo.dallimoserver.challenge.application.ChallengeService;
import com.dallimo.dallimoserver.challenge.application.ChallengeService.View;
import com.dallimo.dallimoserver.challenge.domain.ChallengeStatus;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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

import java.time.Instant;
import java.util.List;

/** 44장 Challenge API (CHL-001~004) + 목록 (명세 표에 경로 없음) */
@RestController
@RequestMapping("/api/v1/challenges")
public class ChallengeController {

    private final ChallengeService challenges;

    public ChallengeController(ChallengeService challenges) {
        this.challenges = challenges;
    }

    public record CreateChallengeRequest(@NotNull @Positive Long targetCourseRecordId) {
    }

    public record UserRef(long userId, String nickname) {
    }

    public record CourseRef(long id, String name, int distanceM) {
    }

    public record TargetBest(long recordId, int timeSec) {
    }

    /**
     * role: SENT(내가 도전) · RECEIVED(내 기록에 도전). targetSec: 목표 기록(만든 때 고정), resultSec: 도전 Run의 공식 기록(인증됐을 때).
     * runId는 도전한 사람에게만 (Run은 본인만 볼 수 있다). targetBest: 상대의 지금 최고 기록 (CHL-004 재도전은 이 기록으로)
     */
    public record ChallengeResponse(long id, ChallengeStatus status, String role, UserRef challenger, UserRef target, CourseRef course,
                                    long targetRecordId, int targetSec, Integer resultSec, Long runId, Instant createdAt, Instant finishedAt,
                                    TargetBest targetBest) {
        public static ChallengeResponse from(View v) {
            var r = v.row();
            return new ChallengeResponse(r.id(), r.status(), v.role(), new UserRef(r.challengerId(), r.challengerName()), new UserRef(r.targetUserId(), r.targetName()),
                    new CourseRef(r.courseId(), r.courseName(), r.courseDistanceM()), r.targetRecordId(), r.targetSec(), r.resultSec(),
                    "SENT".equals(v.role()) ? r.runId() : null, r.createdAt(), r.finishedAt(), new TargetBest(r.bestRecordId(), r.bestSec()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChallengeResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateChallengeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ChallengeResponse.from(challenges.create(userId(jwt), req.targetCourseRecordId()))));
    }

    @GetMapping("/{id}")
    public ApiResponse<ChallengeResponse> get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return ApiResponse.ok(ChallengeResponse.from(challenges.get(userId(jwt), id)));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<ChallengeResponse> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return ApiResponse.ok(ChallengeResponse.from(challenges.cancel(userId(jwt), id)));
    }

    /** 보낸 · 받은 도전 (최근 30개). userId가 있으면 그 친구와 주고받은 것만 */
    @GetMapping
    public ApiResponse<List<ChallengeResponse>> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) Long userId) {
        return ApiResponse.ok(challenges.list(userId(jwt), userId).stream().map(ChallengeResponse::from).toList());
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
