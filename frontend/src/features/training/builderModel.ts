import { endLabel } from '@/entities/workout/labels';
import type { WorkoutBlock, WorkoutStep } from '@/entities/workout/types';
import { WORKOUT_LIMITS } from '@/entities/workout/validate';

// 인터벌 만들기 화면의 편집 모델 (123.2장: Step 추가 · 삭제 · 순서 바꾸기, Repeat Group 묶기 · 반복 횟수).
// 화면 key를 붙인 묶음 · 구간. 저장할 때 key를 뗀다.
export type EditStep = WorkoutStep & { key: string };
export type EditBlock = { key: string; type: 'STEP' | 'REPEAT'; repeatCount: number; steps: EditStep[] };

let seq = 0;
const key = () => `k${++seq}`;

export const newStep = (s: Partial<WorkoutStep> = {}): EditStep => ({
  key: key(),
  stepType: 'WORK',
  endConditionType: 'DISTANCE',
  endConditionValue: 400,
  targetType: null,
  targetMin: null,
  targetMax: null,
  ...s,
});

export function fromBlocks(blocks: WorkoutBlock[]): EditBlock[] {
  return blocks.map((b) => ({ key: key(), type: b.type, repeatCount: b.type === 'REPEAT' ? b.repeatCount : 1, steps: b.steps.map((s) => newStep(s)) }));
}

export function toBlocks(blocks: EditBlock[]): WorkoutBlock[] {
  return blocks.map((b) => ({
    type: b.type,
    repeatCount: b.type === 'REPEAT' ? b.repeatCount : 1,
    steps: b.steps.map(({ key: _key, ...s }) => s),
  }));
}

function swap<T>(list: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= list.length || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** 묶음 순서 바꾸기 (dir: -1 위로, 1 아래로) */
export function moveBlock(blocks: EditBlock[], blockKey: string, dir: -1 | 1): EditBlock[] {
  const i = blocks.findIndex((b) => b.key === blockKey);
  return swap(blocks, i, i + dir);
}

/** 반복 묶음 안 구간 순서 바꾸기 */
export function moveStep(blocks: EditBlock[], blockKey: string, stepKey: string, dir: -1 | 1): EditBlock[] {
  return blocks.map((b) => {
    if (b.key !== blockKey) return b;
    const i = b.steps.findIndex((s) => s.key === stepKey);
    return { ...b, steps: swap(b.steps, i, i + dir) };
  });
}

export function updateStep(blocks: EditBlock[], step: EditStep): EditBlock[] {
  return blocks.map((b) => (b.steps.some((s) => s.key === step.key) ? { ...b, steps: b.steps.map((s) => (s.key === step.key ? step : s)) } : b));
}

/** 구간 지우기. 반복이 아닌 묶음이면 묶음째, 반복 묶음의 마지막 구간이면 묶음도 지운다 */
export function removeStep(blocks: EditBlock[], stepKey: string): EditBlock[] {
  return blocks
    .map((b) => ({ ...b, steps: b.steps.filter((s) => s.key !== stepKey) }))
    .filter((b) => b.steps.length > 0);
}

export function removeBlock(blocks: EditBlock[], blockKey: string): EditBlock[] {
  return blocks.filter((b) => b.key !== blockKey);
}

/** 맨 뒤에 구간 하나. 처음이면 몸풀기 1km, 아니면 빠르게 400m */
export function addStep(blocks: EditBlock[]): EditBlock[] {
  const step = blocks.length === 0 ? newStep({ stepType: 'WARMUP', endConditionValue: 1000 }) : newStep();
  return [...blocks, { key: key(), type: 'STEP', repeatCount: 1, steps: [step] }];
}

/** 맨 뒤에 반복 묶음: (빠르게 400m → 천천히 200m) × 4 */
export function addRepeat(blocks: EditBlock[]): EditBlock[] {
  return [
    ...blocks,
    { key: key(), type: 'REPEAT', repeatCount: 4, steps: [newStep(), newStep({ stepType: 'RECOVERY', endConditionValue: 200 })] },
  ];
}

/** 반복 묶음 안에 구간 추가 (천천히 200m) */
export function addStepToRepeat(blocks: EditBlock[], blockKey: string): EditBlock[] {
  return blocks.map((b) =>
    b.key === blockKey && b.steps.length < WORKOUT_LIMITS.maxStepsInRepeat ? { ...b, steps: [...b.steps, newStep({ stepType: 'RECOVERY', endConditionValue: 200 })] } : b,
  );
}

export function setRepeatCount(blocks: EditBlock[], blockKey: string, count: number): EditBlock[] {
  const n = Math.min(WORKOUT_LIMITS.maxRepeat, Math.max(WORKOUT_LIMITS.minRepeat, Math.round(count)));
  return blocks.map((b) => (b.key === blockKey ? { ...b, repeatCount: n } : b));
}

/** 이름을 비우면 쓰는 이름: 첫 반복 묶음의 빠르게 구간 "400m × 5", 반복이 없으면 첫 빠르게 구간 */
export function autoName(blocks: WorkoutBlock[]): string {
  const repeat = blocks.find((b) => b.type === 'REPEAT');
  if (repeat) {
    const work = repeat.steps.find((s) => s.stepType === 'WORK') ?? repeat.steps[0];
    return `${endLabel(work)} × ${repeat.repeatCount}`;
  }
  const work = blocks.flatMap((b) => b.steps).find((s) => s.stepType === 'WORK');
  return work ? `${endLabel(work)} 인터벌` : '내 인터벌';
}
