package com.dallimo.dallimoserver.running.application;

import com.dallimo.dallimoserver.challenge.application.ChallengeService;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunFinishedEvent;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunMode;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunStatus;
import com.dallimo.dallimoserver.running.domain.RunWorkoutStep;
import com.dallimo.dallimoserver.running.infrastructure.RunWorkoutJdbcRepository;
import com.dallimo.dallimoserver.workout.application.WorkoutService;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import com.dallimo.dallimoserver.running.infrastructure.RunSyncBatchRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 42장 Run API. 모든 쓰기는 재시도해도 결과가 같다 (멱등).
 * 러닝 생성은 clientRunUuid, point 업로드는 batchUuid, 종료는 Run 상태로 판단한다 (22.2 · 25장).
 */
@Service
public class RunService {

    public static final int MAX_POINTS_PER_BATCH = 500;

    private final RunJpaRepository runs;
    private final RunPointJdbcRepository points;
    private final RunSyncBatchRepository batches;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final LiveMemberJdbcRepository liveMembers;
    private final ChallengeService challenges;
    private final RunWorkoutJdbcRepository workoutSteps;
    private final WorkoutService workouts;

    public RunService(RunJpaRepository runs, RunPointJdbcRepository points, RunSyncBatchRepository batches, JdbcTemplate jdbc, Clock clock,
                      ApplicationEventPublisher events, LiveMemberJdbcRepository liveMembers, ChallengeService challenges,
                      RunWorkoutJdbcRepository workoutSteps, WorkoutService workouts) {
        this.runs = runs;
        this.points = points;
        this.batches = batches;
        this.jdbc = jdbc;
        this.clock = clock;
        this.events = events;
        this.liveMembers = liveMembers;
        this.challenges = challenges;
        this.workoutSteps = workoutSteps;
        this.workouts = workouts;
    }

    public record Created(Run run, boolean created) {
    }

    public record BatchResult(String batchUuid, boolean accepted, int lastAcceptedSeq) {
    }

    public record Finished(Run run) {
    }

    public record Detail(Run run, RunMetrics.Result metrics, List<RunWorkoutStep> workoutSteps) {
    }

    /** 인터벌 달리기에서 달린 인터벌. 저장한 인터벌이면 id · 버전, 추천 인터벌이면 이름만 */
    public record WorkoutLink(Long templateId, Integer version, String name) {
    }

    /** 25.1장: 같은 clientRunUuid면 이미 만든 Run을 돌려준다. 동시 요청은 UNIQUE가 막는다 */
    @Transactional
    public Created create(long userId, String clientRunUuid, RunMode mode, Long courseId, Instant startedAt) {
        return create(userId, clientRunUuid, mode, courseId, null, null, null, startedAt);
    }

    @Transactional
    public Created create(long userId, String clientRunUuid, RunMode mode, Long courseId, Long challengeId, Long liveRoomId, Instant startedAt) {
        return create(userId, clientRunUuid, mode, courseId, challengeId, liveRoomId, null, startedAt);
    }

    /**
     * liveRoomId: 함께 달리기 방에서 달린 개인 Run이면 그 방 참가 기록에 이어 둔다 (45.1장 개인 Run은 항상 생성).
     * challengeId: 내 도전(OPEN, 같은 코스)이면 이 Run을 잇는다. 검증이 끝나면 도전을 판정한다
     * workout: 인터벌 달리기(INTERVAL)에만 있다. 저장한 인터벌이면 내 것이고 그 버전이 있어야 한다 (123.3장)
     */
    @Transactional
    public Created create(long userId, String clientRunUuid, RunMode mode, Long courseId, Long challengeId, Long liveRoomId, WorkoutLink workout,
                          Instant startedAt) {
        var existing = runs.findByClientRunUuid(clientRunUuid);
        if (existing.isPresent()) return new Created(owned(existing.get(), userId, ErrorCode.IDEMPOTENCY_CONFLICT), false);
        if (courseId != null && !courseExists(courseId)) throw new ApiException(ErrorCode.COURSE_NOT_FOUND);
        checkWorkout(userId, mode, courseId, workout);
        try {
            Run run = Run.start(userId, clientRunUuid, mode, courseId, startedAt, clock.instant());
            if (workout != null) run.linkWorkout(workout.templateId(), workout.version(), workout.name());
            Run created = runs.saveAndFlush(run);
            // 참가하지 않은 방이면 아무것도 바뀌지 않는다
            if (liveRoomId != null) liveMembers.linkRun(liveRoomId, userId, created.getId());
            if (challengeId != null) challenges.attachRun(userId, challengeId, courseId, created.getId());
            return new Created(created, true);
        } catch (DataIntegrityViolationException race) {
            Run r = runs.findByClientRunUuid(clientRunUuid).orElseThrow(() -> race);
            return new Created(owned(r, userId, ErrorCode.IDEMPOTENCY_CONFLICT), false);
        }
    }

    /**
     * 25.2장 GPS Batch. 같은 batchUuid가 같은 내용으로 다시 오면 성공, 다른 내용이면 IDEMPOTENCY_CONFLICT.
     * 이미 처리한 Batch 재전송은 Run이 끝난 뒤에도 성공으로 답한다 (응답을 못 받은 앱의 재시도).
     */
    @Transactional
    public BatchResult uploadPoints(long userId, long runId, String batchUuid, int fromSeq, int toSeq, List<RunPoint> batch) {
        Run run = owned(runs.findForUpdate(runId).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND)), userId, ErrorCode.RESOURCE_FORBIDDEN);
        var received = new RunSyncBatchRepository.Received(fromSeq, toSeq, batch.size());
        var seen = batches.find(runId, batchUuid);
        if (seen.isPresent()) {
            if (!seen.get().equals(received)) throw new ApiException(ErrorCode.IDEMPOTENCY_CONFLICT);
            return new BatchResult(batchUuid, true, points.lastContiguousSeq(runId));
        }
        if (!run.getStatus().acceptsPoints()) throw new ApiException(ErrorCode.RUN_INVALID_STATE);
        validate(fromSeq, toSeq, batch);
        points.insertAll(runId, batch);
        batches.insert(runId, batchUuid, received, clock.instant());
        return new BatchResult(batchUuid, true, points.lastContiguousSeq(runId));
    }

    @Transactional
    public Run pause(long userId, long runId) {
        Run run = lockOwned(userId, runId);
        run.pause(clock.instant());
        return run;
    }

    @Transactional
    public Run resume(long userId, long runId) {
        Run run = lockOwned(userId, runId);
        run.resume(clock.instant());
        return run;
    }

    /**
     * 42.4장 Finish. 서버에 lastSeq까지 모두 없으면 확정하지 않고 FINISHING으로 답한다 (앱이 빠진 Batch를 보내고 다시 요청).
     * 이미 FINISHED면 저장된 결과를 그대로 돌려준다 (25.3장).
     * 달린 시간은 앱이 계산한 active 시간(일시정지 제외, 사용자 결정)을 쓰되 시작~종료 시간을 넘지 않게 한다. 거리는 point로 다시 계산한다.
     */
    @Transactional
    public Finished finish(long userId, long runId, Instant endedAt, int lastSeq, Integer activeSeconds) {
        return finish(userId, runId, endedAt, lastSeq, activeSeconds, null);
    }

    /** steps: 인터벌 달리기의 구간별 결과. 끝낼 때 한 번 저장한다 (FINISHING이면 다음 요청에 다시 온다) */
    @Transactional
    public Finished finish(long userId, long runId, Instant endedAt, int lastSeq, Integer activeSeconds, List<RunWorkoutStep> steps) {
        Run run = lockOwned(userId, runId);
        if (run.getStatus() == RunStatus.FINISHED) return new Finished(run);
        if (steps != null && !steps.isEmpty()) {
            if (run.getMode() != RunMode.INTERVAL) throw new ApiException(ErrorCode.VALIDATION_ERROR, "구간 결과는 인터벌 달리기에만 보낼 수 있어요.");
            if (steps.size() > RunWorkoutStep.MAX_STEPS) throw new ApiException(ErrorCode.VALIDATION_ERROR, "구간 결과가 너무 많아요.");
            steps.forEach(RunWorkoutStep::validate);
        }
        if (run.getStatus() == RunStatus.CANCELED) throw new ApiException(ErrorCode.RUN_INVALID_STATE);
        if (lastSeq > 0 && points.lastContiguousSeq(runId) < lastSeq) {
            run.markFinishing(clock.instant());
            return new Finished(run);
        }
        Instant end = endedAt.isBefore(run.getStartedAt()) ? run.getStartedAt() : endedAt;
        int wall = (int) Duration.between(run.getStartedAt(), end).toSeconds();
        int elapsed = activeSeconds == null ? wall : Math.max(0, Math.min(activeSeconds, wall));
        RunMetrics.Result m = RunMetrics.compute(points.findAll(runId));
        int distance = (int) Math.round(m.distanceM());
        run.finish(end, elapsed, distance, RunMetrics.avgPace(m.distanceM(), elapsed), clock.instant());
        if (steps != null && !steps.isEmpty()) workoutSteps.insertAll(runId, steps);
        // 코스 러닝이면 커밋 뒤 완주 검증 (26장)
        if (run.awaitingVerification()) events.publishEvent(new RunFinishedEvent(runId));
        return new Finished(run);
    }

    /** 27.3장: 끝난 러닝을 최근 시작 순으로. cursor는 앱이 해석하지 않는 문자열 */
    @Transactional(readOnly = true)
    public CursorPage<Run> list(long userId, String cursor, int size) {
        return list(userId, null, cursor, size);
    }

    /** mode가 있으면 그 모드만 */
    @Transactional(readOnly = true)
    public CursorPage<Run> list(long userId, RunMode mode, String cursor, int size) {
        Instant beforeAt = Instant.parse("9999-12-31T00:00:00Z");
        long beforeId = Long.MAX_VALUE;
        if (cursor != null && !cursor.isBlank()) {
            try {
                String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split(":");
                beforeAt = Instant.ofEpochMilli(Long.parseLong(parts[0]));
                beforeId = Long.parseLong(parts[1]);
            } catch (RuntimeException e) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor가 올바르지 않아요.");
            }
        }
        List<Run> page = runs.findPage(userId, mode, beforeAt, beforeId, PageRequest.of(0, size + 1));
        boolean hasNext = page.size() > size;
        List<Run> items = hasNext ? page.subList(0, size) : page;
        String next = null;
        if (hasNext) {
            Run last = items.get(items.size() - 1);
            next = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString((last.getStartedAt().toEpochMilli() + ":" + last.getId()).getBytes(StandardCharsets.UTF_8));
        }
        return new CursorPage<>(List.copyOf(items), next, hasNext);
    }

    @Transactional(readOnly = true)
    public Detail detail(long userId, long runId) {
        Run run = owned(runs.findById(runId).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND)), userId, ErrorCode.RESOURCE_FORBIDDEN);
        return new Detail(run, RunMetrics.compute(points.findAll(runId)),
                run.getMode() == RunMode.INTERVAL ? workoutSteps.findAll(runId) : List.of());
    }

    /** 코스 러닝의 코스 이름 (courseId → 이름) */
    @Transactional(readOnly = true)
    public Map<Long, String> courseNames(List<Run> list) {
        List<Long> ids = list.stream().map(Run::getCourseId).filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, String> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        new NamedParameterJdbcTemplate(jdbc).query("SELECT id, name FROM tbl_course WHERE id IN (:ids)", Map.of("ids", ids),
                rs -> {
                    out.put(rs.getLong("id"), rs.getString("name"));
                });
        return out;
    }

    /** 인터벌 달리기면 인터벌이 있어야 하고(코스 없이), 아니면 없어야 한다 */
    private void checkWorkout(long userId, RunMode mode, Long courseId, WorkoutLink workout) {
        if (mode != RunMode.INTERVAL) {
            if (workout != null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "인터벌은 인터벌 달리기에만 이을 수 있어요.");
            return;
        }
        if (workout == null || workout.name() == null || workout.name().isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "달린 인터벌을 알려 주세요.");
        if (courseId != null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "인터벌 달리기는 코스 없이 달려요.");
        if (workout.templateId() == null) {
            if (workout.version() != null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "인터벌 버전만 보낼 수 없어요.");
            return;
        }
        if (workout.version() == null || !workouts.canLink(userId, workout.templateId(), workout.version())) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "인터벌을 찾을 수 없어요.");
        }
    }

    private Run lockOwned(long userId, long runId) {
        return owned(runs.findForUpdate(runId).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND)), userId, ErrorCode.RESOURCE_FORBIDDEN);
    }

    /** 16장: runId만 믿지 않고 소유자를 확인한다 */
    private static Run owned(Run run, long userId, ErrorCode otherwise) {
        if (run.getUserId() != userId) throw new ApiException(otherwise);
        return run;
    }

    private boolean courseExists(long courseId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course WHERE id = ? AND deleted_at IS NULL", Integer.class, courseId);
        return n != null && n > 0;
    }

    /** 42.3장: from/to와 실제 seq가 다르거나 값이 범위를 벗어나면 RUN_POINT_INVALID */
    private static void validate(int fromSeq, int toSeq, List<RunPoint> batch) {
        if (batch.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "points가 비어 있어요.");
        if (batch.size() > MAX_POINTS_PER_BATCH) throw new ApiException(ErrorCode.VALIDATION_ERROR, "한 번에 " + MAX_POINTS_PER_BATCH + "개까지 올릴 수 있어요.");
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        Set<Integer> seqs = new HashSet<>();
        for (RunPoint p : batch) {
            if (p.seq() < 1 || !seqs.add(p.seq())) throw invalid("seq는 1 이상이고 겹치지 않아야 해요.");
            if (Math.abs(p.latitude()) > 90 || Math.abs(p.longitude()) > 180) throw invalid("좌표가 범위를 벗어났어요.");
            if (p.recordedAt() == null) throw invalid("recordedAt이 없어요.");
            if (p.accuracyM() != null && (p.accuracyM() < 0 || p.accuracyM() >= 100_000)) throw invalid("accuracyM이 범위를 벗어났어요.");
            if (p.altitudeM() != null && Math.abs(p.altitudeM()) >= 1_000_000) throw invalid("altitudeM이 범위를 벗어났어요.");
            if (p.speedMps() != null && (p.speedMps() < 0 || p.speedMps() >= 10_000)) throw invalid("speedMps가 범위를 벗어났어요.");
            min = Math.min(min, p.seq());
            max = Math.max(max, p.seq());
        }
        if (min != fromSeq || max != toSeq) throw invalid("fromSeq · toSeq가 point의 seq 범위와 달라요.");
    }

    private static ApiException invalid(String message) {
        return new ApiException(ErrorCode.RUN_POINT_INVALID, message);
    }
}
