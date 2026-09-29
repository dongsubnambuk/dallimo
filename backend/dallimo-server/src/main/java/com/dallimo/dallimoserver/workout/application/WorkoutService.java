package com.dallimo.dallimoserver.workout.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.workout.domain.WorkoutDefinition;
import com.dallimo.dallimoserver.workout.infrastructure.WorkoutJdbcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 인터벌 달리기 (123장 Training, 126장 Workout: 템플릿 CRUD · 복제). 내 것만 보고 고친다.
 * 고치면 버전이 오르고 옛 버전 구성은 남는다 (123.3장 "템플릿 수정 이후에도 과거 러닝 결과를 재현").
 */
@Service
public class WorkoutService {

    /** 한 사람이 저장할 수 있는 인터벌 수. 명세에 없어 정한 값 (backend/README 결정 사항) */
    public static final int MAX_TEMPLATES = 50;
    private static final String COPY_SUFFIX = " 복사본";

    private final WorkoutJdbcRepository workouts;
    private final Clock clock;

    public WorkoutService(WorkoutJdbcRepository workouts, Clock clock) {
        this.workouts = workouts;
        this.clock = clock;
    }

    public record Workout(long id, String name, String description, int version, List<WorkoutDefinition.Block> blocks,
                          Instant createdAt, Instant updatedAt, Instant lastRunAt, int runCount) {
    }

    @Transactional(readOnly = true)
    public List<Workout> list(long userId) {
        List<WorkoutJdbcRepository.Row> rows = workouts.list(userId);
        Map<Long, List<WorkoutDefinition.Block>> blocks = workouts.currentBlocks(rows.stream().map(WorkoutJdbcRepository.Row::id).toList());
        return rows.stream().map(r -> view(r, blocks.getOrDefault(r.id(), List.of()))).toList();
    }

    @Transactional(readOnly = true)
    public Workout get(long userId, long id) {
        return load(owned(userId, id));
    }

    @Transactional
    public Workout create(long userId, WorkoutDefinition def) {
        WorkoutDefinition valid = def.validated();
        if (workouts.countActive(userId) >= MAX_TEMPLATES) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "인터벌은 %d개까지 저장할 수 있어요. 안 쓰는 인터벌을 지워 주세요.".formatted(MAX_TEMPLATES));
        }
        return get(userId, workouts.insert(userId, valid, clock.instant()));
    }

    @Transactional
    public Workout update(long userId, long id, WorkoutDefinition def) {
        WorkoutDefinition valid = def.validated();
        owned(userId, id);
        workouts.update(id, valid, clock.instant());
        return get(userId, id);
    }

    @Transactional
    public void delete(long userId, long id) {
        owned(userId, id);
        workouts.softDelete(id, clock.instant());
    }

    /** 복제: 같은 구성으로 새 인터벌 (이름 뒤 " 복사본") */
    @Transactional
    public Workout duplicate(long userId, long id) {
        Workout source = get(userId, id);
        String name = source.name().length() + COPY_SUFFIX.length() > 40
                ? source.name().substring(0, 40 - COPY_SUFFIX.length()).strip() + COPY_SUFFIX
                : source.name() + COPY_SUFFIX;
        return create(userId, new WorkoutDefinition(name, source.description(), source.blocks()));
    }

    /**
     * 달린 기록을 인터벌에 이을 때: 내 인터벌(지운 것 포함)이고 그 버전이 있었는지.
     * 달리는 동안 지웠을 수 있어 지운 것도 받는다
     */
    @Transactional(readOnly = true)
    public boolean canLink(long userId, long id, int version) {
        Long owner = workouts.ownerIncludingDeleted(id);
        return owner != null && owner == userId && workouts.hasVersion(id, version);
    }

    private WorkoutJdbcRepository.Row owned(long userId, long id) {
        WorkoutJdbcRepository.Row row = workouts.find(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "인터벌을 찾을 수 없어요."));
        if (row.userId() != userId) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN);
        return row;
    }

    private Workout load(WorkoutJdbcRepository.Row row) {
        return view(row, workouts.currentBlocks(List.of(row.id())).getOrDefault(row.id(), List.of()));
    }

    private static Workout view(WorkoutJdbcRepository.Row r, List<WorkoutDefinition.Block> blocks) {
        return new Workout(r.id(), r.name(), r.description(), r.version(), blocks, r.createdAt(), r.updatedAt(), r.lastRunAt(), r.runCount());
    }
}
