package com.dallimo.dallimoserver.running.domain;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.workout.domain.WorkoutDefinition;

/**
 * 인터벌 달리기에서 달린 구간 하나 (123.2장 "각 Step별 실제 시간, 평균 페이스, 목표 대비 차이").
 * 그때 구간 정의(step)와 반복 몇 번째인지, 실제 거리 · 시간을 둔다. completed: 조건을 채워 넘어갔으면 true, 중간에 끝냈으면 false.
 * 거리 · 시간은 앱이 달리면서 잰 값이다 (공식 기록이 아닌 개인 훈련 기록, backend/README 결정 사항)
 */
public record RunWorkoutStep(WorkoutDefinition.Step step, Integer repeatIndex, Integer repeatCount, int distanceM, int elapsedSeconds, boolean completed) {

    public static final int MAX_STEPS = WorkoutDefinition.MAX_FLAT_STEPS;

    public void validate() {
        if (step == null) throw invalid("구간 정의가 없어요.");
        step.validate();
        if ((repeatIndex == null) != (repeatCount == null)) throw invalid("반복 몇 번째인지와 반복 횟수는 함께 보내 주세요.");
        if (repeatIndex != null && (repeatCount < WorkoutDefinition.MIN_REPEAT || repeatCount > WorkoutDefinition.MAX_REPEAT
                || repeatIndex < 1 || repeatIndex > repeatCount)) throw invalid("반복 값이 범위를 벗어났어요.");
        if (distanceM < 0 || distanceM > 200_000) throw invalid("구간 거리가 범위를 벗어났어요.");
        if (elapsedSeconds < 0 || elapsedSeconds > 86_400) throw invalid("구간 시간이 범위를 벗어났어요.");
    }

    private static ApiException invalid(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }
}
