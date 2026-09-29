import type { WorkoutPlan, WorkoutStep } from './types';

// 123.1장 "추천 템플릿". 명세 예시(400m 인터벌) + 시간 기반 · 페이스 목표 예시. 값은 명세에 없어 정한 시작값 (FOUNDATION-DECISION-LOG 45항)
const step = (
  stepType: WorkoutStep['stepType'],
  endConditionType: WorkoutStep['endConditionType'],
  endConditionValue: number | null,
  target?: Pick<WorkoutStep, 'targetType' | 'targetMin' | 'targetMax'>,
): WorkoutStep => ({ stepType, endConditionType, endConditionValue, targetType: null, targetMin: null, targetMax: null, ...target });

export type WorkoutTemplate = WorkoutPlan & { key: string; caption: string };

export const RECOMMENDED_WORKOUTS: WorkoutTemplate[] = [
  {
    key: '400m',
    id: null,
    version: null,
    name: '400m 인터벌',
    caption: '트랙 한 바퀴를 빠르게, 반 바퀴를 천천히',
    blocks: [
      { type: 'STEP', repeatCount: 1, steps: [step('WARMUP', 'DISTANCE', 1000)] },
      {
        type: 'REPEAT',
        repeatCount: 5,
        steps: [
          step('WORK', 'DISTANCE', 400, { targetType: 'TARGET_TIME', targetMin: 90, targetMax: 90 }),
          step('RECOVERY', 'DISTANCE', 200, { targetType: 'TARGET_TIME', targetMin: null, targetMax: 90 }),
        ],
      },
      { type: 'STEP', repeatCount: 1, steps: [step('COOLDOWN', 'DISTANCE', 1000)] },
    ],
  },
  {
    key: '1min',
    id: null,
    version: null,
    name: '1분 빠르게 · 1분 천천히',
    caption: '시간만 보고 달려요. 처음 인터벌에 좋아요',
    blocks: [
      { type: 'STEP', repeatCount: 1, steps: [step('WARMUP', 'TIME', 300)] },
      { type: 'REPEAT', repeatCount: 8, steps: [step('WORK', 'TIME', 60), step('RECOVERY', 'TIME', 60)] },
      { type: 'STEP', repeatCount: 1, steps: [step('COOLDOWN', 'TIME', 300)] },
    ],
  },
  {
    key: '1km',
    id: null,
    version: null,
    name: '1km 반복',
    caption: "1km를 5'00\" 페이스로 세 번",
    blocks: [
      { type: 'STEP', repeatCount: 1, steps: [step('WARMUP', 'DISTANCE', 1000)] },
      {
        type: 'REPEAT',
        repeatCount: 3,
        steps: [step('WORK', 'DISTANCE', 1000, { targetType: 'TARGET_PACE', targetMin: 300, targetMax: 300 }), step('RECOVERY', 'TIME', 180)],
      },
      { type: 'STEP', repeatCount: 1, steps: [step('COOLDOWN', 'DISTANCE', 1000)] },
    ],
  },
];

/** "직접 만들기"의 시작 구성: 몸풀기 1km → (빠르게 400m → 천천히 200m) × 5 → 마무리 1km. 1분 안에 저장할 수 있게 (129장) */
export function starterBlocks() {
  return RECOMMENDED_WORKOUTS[0].blocks.map((b) => ({ ...b, steps: b.steps.map((s) => ({ ...s })) }));
}
