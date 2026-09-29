// 인터벌 달리기 (명세 123장 Training). 서버 /api/v1/workouts와 같은 모양 (126장).
// 단위: DISTANCE 값은 m, TIME 값은 초, MANUAL은 값 없음. TARGET_TIME은 초, TARGET_PACE는 1km당 초.

// 123.2장 Step Type. 앱에서는 몸풀기 · 빠르게 · 천천히 · 마무리 (FOUNDATION-DECISION-LOG 40항)
export type StepType = 'WARMUP' | 'WORK' | 'RECOVERY' | 'COOLDOWN';
export type EndConditionType = 'DISTANCE' | 'TIME' | 'MANUAL';
export type TargetType = 'TARGET_TIME' | 'TARGET_PACE';

// 목표: min = max면 "목표 1:30", max만 있으면 "최대 1:30", min만 있으면 "최소". TARGET_TIME은 거리 구간에서만
export type WorkoutStep = {
  stepType: StepType;
  endConditionType: EndConditionType;
  endConditionValue: number | null;
  targetType: TargetType | null;
  targetMin: number | null;
  targetMax: number | null;
};

// STEP: 구간 하나, REPEAT: 여러 구간을 묶어 repeatCount번 (123.2장 Repeat Group)
export type WorkoutBlock = { type: 'STEP' | 'REPEAT'; repeatCount: number; steps: WorkoutStep[] };

// 달릴 인터벌. 저장한 인터벌이면 id · 버전, 추천 인터벌을 저장하지 않고 달리면 id · 버전이 없다
export type WorkoutPlan = { id: string | null; version: number | null; name: string; blocks: WorkoutBlock[] };

// 저장한 인터벌 (GET /workouts)
export type Workout = WorkoutPlan & {
  id: string;
  version: number;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  // 이 인터벌로 마지막으로 달린 때 · 끝낸 달리기 수
  lastRunAt: number | null;
  runCount: number;
};

// 저장 · 고치기 요청
export type WorkoutDraft = { name: string; description: string | null; blocks: WorkoutBlock[] };

// 반복을 풀어 순서대로 늘어놓은 구간. repeatIndex: 반복 몇 번째(1부터), 반복이 아니면 null
export type FlatStep = WorkoutStep & { repeatIndex: number | null; repeatCount: number | null };

// 구간이 끝난 지점 (active 경과 ms · 누적 거리 m). completed: 조건을 채웠거나 직접 넘겼으면 true, 도중에 달리기를 끝냈으면 false
export type StepBoundary = { activeMs: number; distanceM: number; completed: boolean };

// 달린 구간 하나의 결과 (123.2장 "각 Step별 실제 시간, 평균 페이스, 목표 대비 차이")
export type StepResult = FlatStep & { distanceM: number; elapsedSec: number; completed: boolean };

// 러닝 결과의 인터벌 (서버 GET /runs/{id}의 workout)
export type RunWorkoutResult = { templateId: string | null; version: number | null; name: string; steps: StepResult[] };
