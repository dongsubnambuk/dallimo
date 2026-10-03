package com.dallimo.dallimoserver.verification.application;

import com.dallimo.dallimoserver.common.observability.DallimoMetrics;
import com.dallimo.dallimoserver.activity.application.ActivityService;
import com.dallimo.dallimoserver.gamification.application.CourseTitleService;
import com.dallimo.dallimoserver.gamification.application.SegmentService;
import com.dallimo.dallimoserver.challenge.application.ChallengeService;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunSource;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import com.dallimo.dallimoserver.verification.domain.CourseVerifier;
import com.dallimo.dallimoserver.verification.domain.VerificationOutcome;
import com.dallimo.dallimoserver.verification.domain.VerificationPolicy;
import com.dallimo.dallimoserver.verification.domain.VerificationResult;
import com.dallimo.dallimoserver.verification.infrastructure.VerificationJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(CourseVerificationService.class);

    private final RunJpaRepository runs;
    private final RunPointJdbcRepository points;
    private final CourseJdbcRepository courses;
    private final VerificationJdbcRepository store;
    private final ChallengeService challenges;
    private final RecordBeatenNotifier recordBeaten;
    private final RankingService ranking;
    private final ActivityService activities;
    private final CourseTitleService titles;
    private final SegmentService segments;
    private final Clock clock;
    private final DallimoMetrics metrics;

    public CourseVerificationService(RunJpaRepository runs, RunPointJdbcRepository points, CourseJdbcRepository courses,
                                     VerificationJdbcRepository store, ChallengeService challenges, RecordBeatenNotifier recordBeaten, Clock clock, RankingService ranking, ActivityService activities,
                                     CourseTitleService titles, SegmentService segments, DallimoMetrics metrics) {
        this.metrics = metrics;
        this.runs = runs;
        this.points = points;
        this.courses = courses;
        this.store = store;
        this.challenges = challenges;
        this.recordBeaten = recordBeaten;
        this.ranking = ranking;
        this.activities = activities;
        this.titles = titles;
        this.segments = segments;
        this.clock = clock;
    }

    /** 판정했으면 결과, 이미 판정했거나 검증 대상이 아니면 비어 있음 */
    @Transactional
    public Optional<VerificationResult> verify(long runId) {
        Run run = runs.findForUpdate(runId).orElse(null);
        if (run == null || !run.awaitingVerification() || run.getCourseId() == null) return Optional.empty();
        long courseId = run.getCourseId();
        VerificationPolicy policy = policyFor(run.getSource());
        run.verifiedWith(policy.version());
        List<CourseRoute.Point> route = courses.routes(List.of(courseId)).getOrDefault(courseId, List.of());
        List<RunPoint> runPoints = points.findAll(runId);
        VerificationResult result = CourseVerifier.verify(route, runPoints, policy);

        Instant now = clock.instant();
        store.insertResult(runId, result, policy.version(), now);
        if (result.outcome() == VerificationOutcome.VERIFIED) {
            int courseDistance = store.courseDistance(courseId).orElse(result.segmentDistanceM());
            int pace = (int) Math.round(result.recordSeconds() / (Math.max(1, courseDistance) / 1000.0));
            store.insertRecord(courseId, runId, run.getUserId(), result.recordSeconds(), pace, result.matchRate(), now);
            recordBeaten.onRecord(courseId, runId, run.getUserId(), result.recordSeconds());
            // ACT: 첫 기록 · PB 갱신 · 이번 주 3위 안으로 올라섬
            long recordId = store.recordIdOfRun(runId);
            RankingService.RankChange rank = ranking.weeklyChange(courseId, run.getUserId(), recordId, now);
            activities.onRecord(courseId, recordId, run.getUserId(), result.recordSeconds(), rank.before(), rank.after(), now);
            // 124장: 이 기록으로 코스 크라운 · 로컬 레전드가 됐으면 활동으로 남긴다
            activities.onTitles(recordId, run.getUserId(), titles.change(courseId, run.getUserId(), recordId, now), now);
            // 124장 Segment Attack: 코스를 약 1km씩 나눈 구간 기록
            segments.record(courseId, courseDistance, runId, run.getUserId(), route, runPoints, now);
        }
        run.completeVerification(result.outcome().name(), now);
        // 34장 Verification: runId · policyVersion · matchRate · failureReason
        log.info("run.verification runId={} courseId={} outcome={} policyVersion={} matchRate={} failureReason={} recordSec={}", runId, courseId,
                result.outcome(), policy.version(), result.matchRate(), result.failureReason(), result.recordSeconds());
        metrics.verification(result.outcome().name(), result.failureReason() == null ? null : result.failureReason().name(), policy.version());
        // 이 Run으로 진행 중인 도전 판정 (CHL-003)
        challenges.judge(runId, result.outcome() == VerificationOutcome.VERIFIED ? result.recordSeconds() : null, now);
        return Optional.of(result);
    }

    /** 122.2장 source별 verification policy: 달리모 기록은 기본, 건강 앱에서 가져온 기록은 더 엄격하게 */
    public static VerificationPolicy policyFor(RunSource source) {
        return source == RunSource.DALLIMO ? VerificationPolicy.CURRENT : VerificationPolicy.IMPORTED;
    }

    @Transactional(readOnly = true)
    public Optional<VerificationJdbcRepository.Summary> summary(long runId) {
        return store.summary(runId);
    }

    public List<Long> stalePending(Instant updatedBefore, int limit) {
        return store.stalePending(updatedBefore, limit);
    }
}
