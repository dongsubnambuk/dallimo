package com.dallimo.dallimoserver.verification.application;

import com.dallimo.dallimoserver.challenge.application.ChallengeService;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import com.dallimo.dallimoserver.verification.domain.CourseVerifier;
import com.dallimo.dallimoserver.verification.domain.VerificationOutcome;
import com.dallimo.dallimoserver.verification.domain.VerificationPolicy;
import com.dallimo.dallimoserver.verification.domain.VerificationResult;
import com.dallimo.dallimoserver.verification.infrastructure.VerificationJdbcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 코스 러닝 완주 검증 (WBS 5, 26장). Run 행을 잠그고 검증 대기일 때만 판정해 여러 번 불려도 결과가 하나다.
 * VERIFIED면 공식 기록(tbl_course_record)을 만든다. 공식 랭킹 · PB는 이 기록만 쓴다 (20.1장). 이 Run의 도전도 여기서 판정한다.
 */
@Service
public class CourseVerificationService {

    private final RunJpaRepository runs;
    private final RunPointJdbcRepository points;
    private final CourseJdbcRepository courses;
    private final VerificationJdbcRepository store;
    private final ChallengeService challenges;
    private final Clock clock;

    public CourseVerificationService(RunJpaRepository runs, RunPointJdbcRepository points, CourseJdbcRepository courses,
                                     VerificationJdbcRepository store, ChallengeService challenges, Clock clock) {
        this.runs = runs;
        this.points = points;
        this.courses = courses;
        this.store = store;
        this.challenges = challenges;
        this.clock = clock;
    }

    /** 판정했으면 결과, 이미 판정했거나 검증 대상이 아니면 비어 있음 */
    @Transactional
    public Optional<VerificationResult> verify(long runId) {
        Run run = runs.findForUpdate(runId).orElse(null);
        if (run == null || !run.awaitingVerification() || run.getCourseId() == null) return Optional.empty();
        long courseId = run.getCourseId();
        VerificationPolicy policy = VerificationPolicy.CURRENT;
        List<CourseRoute.Point> route = courses.routes(List.of(courseId)).getOrDefault(courseId, List.of());
        VerificationResult result = CourseVerifier.verify(route, points.findAll(runId), policy);

        Instant now = clock.instant();
        store.insertResult(runId, result, policy.version(), now);
        if (result.outcome() == VerificationOutcome.VERIFIED) {
            int courseDistance = store.courseDistance(courseId).orElse(result.segmentDistanceM());
            int pace = (int) Math.round(result.recordSeconds() / (Math.max(1, courseDistance) / 1000.0));
            store.insertRecord(courseId, runId, run.getUserId(), result.recordSeconds(), pace, result.matchRate(), now);
        }
        run.completeVerification(result.outcome().name(), now);
        // 이 Run으로 진행 중인 도전 판정 (CHL-003)
        challenges.judge(runId, result.outcome() == VerificationOutcome.VERIFIED ? result.recordSeconds() : null, now);
        return Optional.of(result);
    }

    @Transactional(readOnly = true)
    public Optional<VerificationJdbcRepository.Summary> summary(long runId) {
        return store.summary(runId);
    }

    public List<Long> stalePending(Instant updatedBefore, int limit) {
        return store.stalePending(updatedBefore, limit);
    }
}
