package com.dallimo.dallimoserver.workout.domain;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;

import java.util.List;

/**
 * 인터벌 구성 (123.2장). 저장 · 수정 · 달린 기록에서 같은 규칙으로 확인한다.
 * 범위 값은 명세에 없어 정한 시작값이다 (backend/README 결정 사항).
 */
public record WorkoutDefinition(String name, String description, List<Block> blocks) {

    public static final int MAX_BLOCKS = 20;
    public static final int MAX_STEPS_IN_REPEAT = 10;
    public static final int MIN_REPEAT = 2;
    public static final int MAX_REPEAT = 30;
    public static final int MAX_FLAT_STEPS = 200;
    public static final int MIN_DISTANCE_M = 50;
    public static final int MAX_DISTANCE_M = 50_000;
    public static final int MIN_TIME_SEC = 10;
    public static final int MAX_TIME_SEC = 3 * 60 * 60;
    public static final int MIN_TARGET_SEC = 10;
    public static final int MAX_TARGET_SEC = 10 * 60 * 60;
    public static final int MIN_PACE_SEC = 2 * 60;
    public static final int MAX_PACE_SEC = 20 * 60;

    public record Step(StepType stepType, EndConditionType endConditionType, Integer endConditionValue, TargetType targetType,
                       Integer targetMin, Integer targetMax) {

        /** 구간 하나가 말이 되는지. 틀리면 VALIDATION_ERROR */
        public void validate() {
            if (stepType == null || endConditionType == null) throw invalid("구간 종류와 끝나는 조건을 정해 주세요.");
            switch (endConditionType) {
                case DISTANCE -> requireRange(endConditionValue, MIN_DISTANCE_M, MAX_DISTANCE_M, "거리는 %d m ~ %d km로 정해 주세요.".formatted(MIN_DISTANCE_M, MAX_DISTANCE_M / 1000));
                case TIME -> requireRange(endConditionValue, MIN_TIME_SEC, MAX_TIME_SEC, "시간은 %d초 ~ %d시간으로 정해 주세요.".formatted(MIN_TIME_SEC, MAX_TIME_SEC / 3600));
                case MANUAL -> {
                    if (endConditionValue != null) throw invalid("직접 넘기는 구간은 거리 · 시간이 없어요.");
                }
            }
            if (targetType == null) {
                if (targetMin != null || targetMax != null) throw invalid("목표 종류를 정해 주세요.");
                return;
            }
            if (targetMin == null && targetMax == null) throw invalid("목표 값을 정해 주세요.");
            if (targetMin != null && targetMax != null && targetMin > targetMax) throw invalid("목표 최소가 최대보다 커요.");
            if (targetType == TargetType.TARGET_TIME) {
                // 시간이 정해진 구간 · 직접 넘기는 구간은 걸린 시간이 목표가 될 수 없다
                if (endConditionType != EndConditionType.DISTANCE) throw invalid("목표 시간은 거리 구간에만 정할 수 있어요.");
                optionalRange(targetMin, MIN_TARGET_SEC, MAX_TARGET_SEC, "목표 시간이 범위를 벗어났어요.");
                optionalRange(targetMax, MIN_TARGET_SEC, MAX_TARGET_SEC, "목표 시간이 범위를 벗어났어요.");
            } else {
                optionalRange(targetMin, MIN_PACE_SEC, MAX_PACE_SEC, "목표 페이스는 2분 ~ 20분(1km)으로 정해 주세요.");
                optionalRange(targetMax, MIN_PACE_SEC, MAX_PACE_SEC, "목표 페이스는 2분 ~ 20분(1km)으로 정해 주세요.");
            }
        }
    }

    public record Block(BlockType type, Integer repeatCount, List<Step> steps) {

        public int count() {
            return type == BlockType.REPEAT ? repeatCount : 1;
        }
    }

    /** 이름 · 설명 · 구간 구성을 확인한다. 이름은 앞뒤 공백을 뺀 값 */
    public WorkoutDefinition validated() {
        String n = name == null ? "" : name.strip();
        if (n.isEmpty() || n.length() > 40) throw invalid("이름은 1~40자로 정해 주세요.");
        String d = description == null || description.isBlank() ? null : description.strip();
        if (d != null && d.length() > 200) throw invalid("설명은 200자까지 쓸 수 있어요.");
        if (blocks == null || blocks.isEmpty()) throw invalid("구간을 하나 이상 넣어 주세요.");
        if (blocks.size() > MAX_BLOCKS) throw invalid("구간 묶음은 %d개까지 넣을 수 있어요.".formatted(MAX_BLOCKS));
        int flat = 0;
        for (Block b : blocks) {
            if (b == null || b.type() == null || b.steps() == null || b.steps().isEmpty()) throw invalid("빈 구간 묶음이 있어요.");
            if (b.type() == BlockType.STEP) {
                if (b.steps().size() != 1) throw invalid("반복이 아닌 묶음에는 구간이 하나만 들어가요.");
                if (b.repeatCount() != null && b.repeatCount() != 1) throw invalid("반복이 아닌 묶음은 반복 횟수가 없어요.");
            } else {
                if (b.steps().size() > MAX_STEPS_IN_REPEAT) throw invalid("반복 묶음에는 구간을 %d개까지 넣을 수 있어요.".formatted(MAX_STEPS_IN_REPEAT));
                requireRange(b.repeatCount(), MIN_REPEAT, MAX_REPEAT, "반복은 %d~%d회로 정해 주세요.".formatted(MIN_REPEAT, MAX_REPEAT));
            }
            for (Step s : b.steps()) {
                if (s == null) throw invalid("빈 구간이 있어요.");
                s.validate();
            }
            flat += b.steps().size() * b.count();
        }
        if (flat > MAX_FLAT_STEPS) throw invalid("반복을 풀면 구간이 %d개를 넘어요.".formatted(MAX_FLAT_STEPS));
        List<Block> normalized = blocks.stream().map(b -> new Block(b.type(), b.count(), List.copyOf(b.steps()))).toList();
        return new WorkoutDefinition(n, d, normalized);
    }

    private static void requireRange(Integer v, int min, int max, String message) {
        if (v == null || v < min || v > max) throw invalid(message);
    }

    private static void optionalRange(Integer v, int min, int max, String message) {
        if (v != null && (v < min || v > max)) throw invalid(message);
    }

    static ApiException invalid(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }
}
