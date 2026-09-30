package com.dallimo.dallimoserver.activityimport.application;

import com.dallimo.dallimoserver.activityimport.domain.ExternalActivity;
import com.dallimo.dallimoserver.activityimport.domain.ImportStatus;
import com.dallimo.dallimoserver.activityimport.infrastructure.ActivityImportJdbcRepository;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.running.application.RunService;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunFinishedEvent;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunSource;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import com.dallimo.dallimoserver.verification.application.CourseVerificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 122.2장 Import 파이프라인: Normalize → Duplicate Check → Run 저장 → Course Matcher → Verification Policy → CourseRecord 여부.
 * 같은 원본 기록(source + 원본 id)은 한 번만 러닝이 된다. 같은 시간에 달리모로 기록한 러닝이 있으면 새로 만들지 않고 병합 후보로 남긴다.
 * 공식 기록은 가져온 기록용 검증 정책(VerificationPolicy.IMPORTED)을 통과해야 생긴다. 실패는 사유를 남겨 다시 시도할 수 있다.
 */
@Service
public class ActivityImportService {

    /** 겹치는 시간이 짧은 쪽 기록의 이 비율 이상이면 같은 달리기로 본다 (명세에 값 없음) */
    public static final double SAME_ACTIVITY_OVERLAP = 0.5;
    public static final int MAX_CHECK = 200;
    public static final String COURSE_MATCH_FAILED = "COURSE_MATCH_FAILED";
    private static final Logger log = LoggerFactory.getLogger(ActivityImportService.class);

    private final RunJpaRepository runs;
    private final RunPointJdbcRepository points;
    private final ActivityImportJdbcRepository ledger;
    private final CourseMatcher matcher;
    private final RunService runService;
    private final CourseVerificationService verification;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final TransactionTemplate tx;
    private final TransactionTemplate newTx;

    public ActivityImportService(RunJpaRepository runs, RunPointJdbcRepository points, ActivityImportJdbcRepository ledger, CourseMatcher matcher,
                                 RunService runService, CourseVerificationService verification, ApplicationEventPublisher events, Clock clock,
                                 PlatformTransactionManager txm) {
        this.runs = runs;
        this.points = points;
        this.ledger = ledger;
        this.matcher = matcher;
        this.runService = runService;
        this.verification = verification;
        this.events = events;
        this.clock = clock;
        this.tx = new TransactionTemplate(txm);
        this.newTx = new TransactionTemplate(txm);
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** 코스 매칭 결과. matchRate: 코스 경로 중 따라 달린 비율(%) */
    public record CourseMatch(long courseId, String name, Double matchRate) {
    }

    /** 가져오기 결과 하나 (122.3장 Import 결과: 매칭 코스 · 검증 상태) */
    public record Result(String externalId, ImportStatus status, Long runId, Long mergedRunId, String failureReason, CourseMatch course,
                         String verificationStatus) {
    }

    public Result importActivity(long userId, ExternalActivity input) {
        ExternalActivity a;
        try {
            a = input.normalized();
        } catch (ApiException e) {
            // 받을 수 없는 기록도 사유를 남겨 후보 목록에서 알려 준다 (source · id가 올바를 때)
            if (input.source() != null && input.source().importable() && input.externalId() != null && !input.externalId().isBlank()
                    && input.externalId().length() <= 191) {
                newTx.executeWithoutResult(s -> ledger.save(userId, input.source(), input.externalId().trim(), ImportStatus.FAILED, null, null,
                        truncate(e.getMessage()), clock.instant()));
            }
            throw e;
        }
        try {
            return tx.execute(s -> doImport(userId, a));
        } catch (DataIntegrityViolationException race) {
            // 같은 기록을 동시에 가져왔다: 먼저 끝난 결과를 돌려준다
            return tx.execute(s -> ledger.findForUpdate(userId, a.source(), a.externalId()).map(this::resultOf).orElseThrow(() -> race));
        }
    }

    private Result doImport(long userId, ExternalActivity a) {
        Instant now = clock.instant();
        Optional<ActivityImportJdbcRepository.Row> seen = ledger.findForUpdate(userId, a.source(), a.externalId());
        if (seen.isPresent() && seen.get().status() != ImportStatus.FAILED) return resultOf(seen.get());

        // 같은 시간에 달린 내 기록이 있으면 새로 만들지 않는다 (예: 달리모로 기록하면서 워치도 운동을 기록한 경우)
        Optional<ActivityImportJdbcRepository.Span> same = ledger.overlappingRuns(userId, a.startedAt(), a.endedAt()).stream()
                .filter(r -> sameActivity(r.startedAt(), r.endedAt(), a.startedAt(), a.endedAt()))
                .findFirst();
        if (same.isPresent()) {
            ledger.save(userId, a.source(), a.externalId(), ImportStatus.MERGE_CANDIDATE, null, same.get().runId(), null, now);
            return new Result(a.externalId(), ImportStatus.MERGE_CANDIDATE, null, same.get().runId(), null, null, null);
        }

        String problem = null;
        Optional<CourseMatcher.Match> match = Optional.empty();
        try {
            match = matcher.match(userId, a.points(), CourseVerificationService.policyFor(a.source()));
        } catch (RuntimeException e) {
            // 코스 매칭이 실패해도 기록은 남긴다 (122.2장)
            log.warn("코스 매칭 실패: user={} id={}", userId, a.externalId(), e);
            problem = COURSE_MATCH_FAILED;
        }

        Run run = runs.saveAndFlush(Run.imported(userId, UUID.randomUUID().toString(), a.source(), a.sourceProvider(), a.externalId(),
                a.sourceDeviceName(), match.map(CourseMatcher.Match::courseId).orElse(null), a.startedAt(), now));
        if (!a.points().isEmpty()) points.insertAll(run.getId(), a.points());
        int wall = (int) Duration.between(a.startedAt(), a.endedAt()).toSeconds();
        int elapsed = Math.max(0, Math.min(a.activeSeconds(), wall));
        int distance = a.points().size() >= 2 ? (int) Math.round(RunMetrics.compute(a.points()).distanceM()) : (a.distanceM() == null ? 0 : a.distanceM());
        run.finish(a.endedAt(), elapsed, distance, RunMetrics.avgPace(distance, elapsed), now);
        if (problem != null) run.importProblem(problem, now);
        runs.saveAndFlush(run);
        ledger.save(userId, a.source(), a.externalId(), ImportStatus.IMPORTED, run.getId(), null, null, now);
        // 코스를 완주했으면 커밋 뒤 가져온 기록용 정책으로 검증한다 → 인증되면 공식 기록 · PB · 랭킹
        if (run.awaitingVerification()) events.publishEvent(new RunFinishedEvent(run.getId()));
        return new Result(a.externalId(), ImportStatus.IMPORTED, run.getId(), null, problem,
                match.map(m -> new CourseMatch(m.courseId(), m.name(), m.matchRate())).orElse(null), run.getVerificationStatus());
    }

    /** 이미 처리한 기록의 결과 (다시 보내도 같은 결과) */
    private Result resultOf(ActivityImportJdbcRepository.Row row) {
        if (row.status() != ImportStatus.IMPORTED || row.runId() == null) {
            return new Result(row.externalId(), row.status(), row.runId(), row.mergedRunId(), row.failureReason(), null, null);
        }
        Run run = runs.findById(row.runId()).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND));
        CourseMatch course = null;
        if (run.getCourseId() != null) {
            String name = runService.courseNames(List.of(run)).get(run.getCourseId());
            Double rate = verification.summary(run.getId()).map(v -> v.matchRate()).orElse(null);
            course = new CourseMatch(run.getCourseId(), name, rate);
        }
        return new Result(row.externalId(), ImportStatus.IMPORTED, run.getId(), null, run.getImportFailureReason(), course, run.getVerificationStatus());
    }

    /** 이미 가져온 · 병합 후보 · 실패한 기록 (후보 목록에서 거르거나 상태를 보여 준다) */
    public List<ActivityImportJdbcRepository.Row> check(long userId, RunSource source, List<String> externalIds) {
        if (source == null || !source.importable()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "아직 가져올 수 없는 기록이에요.");
        if (externalIds.size() > MAX_CHECK) throw new ApiException(ErrorCode.VALIDATION_ERROR, "한 번에 %d개까지 확인할 수 있어요.".formatted(MAX_CHECK));
        return ledger.find(userId, source, externalIds.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).distinct().toList());
    }

    /** 122.3장 연동 설정: source마다 가져온 수 · 마지막으로 가져온 때 (권한 · 연결은 기기가 안다) */
    public List<ActivityImportJdbcRepository.Totals> integrations(long userId) {
        List<ActivityImportJdbcRepository.Totals> have = ledger.totals(userId);
        return Arrays.stream(RunSource.values()).filter(RunSource::importable)
                .map(s -> have.stream().filter(t -> t.source() == s).findFirst().orElse(new ActivityImportJdbcRepository.Totals(s, 0, null)))
                .toList();
    }

    static boolean sameActivity(Instant aStart, Instant aEnd, Instant bStart, Instant bEnd) {
        long overlap = Duration.between(aStart.isAfter(bStart) ? aStart : bStart, aEnd.isBefore(bEnd) ? aEnd : bEnd).toSeconds();
        long shorter = Math.min(Duration.between(aStart, aEnd).toSeconds(), Duration.between(bStart, bEnd).toSeconds());
        return shorter > 0 && overlap >= shorter * SAME_ACTIVITY_OVERLAP;
    }

    private static String truncate(String s) {
        return s == null ? null : s.length() > 200 ? s.substring(0, 200) : s;
    }
}
