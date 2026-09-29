import type { FlatStep, StepBoundary, StepResult, WorkoutStep } from './types';

// 인터벌 달리기 구간 판정 (123.2장). 엔진이 point마다 · 1초마다 (active 경과, 누적 거리)를 넣으면 끝난 구간을 닫는다.
// 거리 구간은 400m를 넘긴 point 사이를 직선으로 나눠 정확히 400m 지점의 시각으로 닫는다 (1초에 3~4m씩 오차가 쌓이지 않게).
// 일시정지 동안은 active 경과 · 거리가 늘지 않으므로 구간도 멈춘다.

export type IntervalSample = { activeMs: number; distanceM: number };
export type IntervalTrack = { boundaries: StepBoundary[]; last: IntervalSample | null };

const ORIGIN: IntervalSample = { activeMs: 0, distanceM: 0 };

export const initialIntervalTrack = (): IntervalTrack => ({ boundaries: [], last: null });

export function stepStart(boundaries: StepBoundary[], index: number): IntervalSample {
  return index === 0 ? ORIGIN : (boundaries[index - 1] ?? ORIGIN);
}

// 경과 · 거리는 줄지 않는다 (GPS 시각이 1초 표본보다 늦게 올 때)
function forward(prev: IntervalSample, s: IntervalSample): IntervalSample {
  return { activeMs: Math.max(prev.activeMs, s.activeMs), distanceM: Math.max(prev.distanceM, s.distanceM) };
}

/** 새 표본으로 끝난 구간을 닫는다. 짧은 구간이면 한 번에 여러 개가 끝날 수 있다 */
export function advanceInterval(flat: FlatStep[], track: IntervalTrack, sample: IntervalSample): IntervalTrack {
  const prev = track.last ?? ORIGIN;
  const s = forward(prev, sample);
  const boundaries = [...track.boundaries];
  for (;;) {
    const i = boundaries.length;
    const step = flat[i];
    if (!step) break;
    const start = stepStart(boundaries, i);
    if (step.endConditionType === 'DISTANCE') {
      const target = start.distanceM + (step.endConditionValue ?? 0);
      if (s.distanceM < target) break;
      const span = s.distanceM - prev.distanceM;
      const f = span > 0 ? Math.min(1, Math.max(0, (target - prev.distanceM) / span)) : 1;
      boundaries.push({ activeMs: Math.max(start.activeMs, Math.round(prev.activeMs + f * (s.activeMs - prev.activeMs))), distanceM: target, completed: true });
    } else if (step.endConditionType === 'TIME') {
      const target = start.activeMs + (step.endConditionValue ?? 0) * 1000;
      if (s.activeMs < target) break;
      const span = s.activeMs - prev.activeMs;
      const f = span > 0 ? Math.min(1, Math.max(0, (target - prev.activeMs) / span)) : 1;
      boundaries.push({ activeMs: target, distanceM: Math.max(start.distanceM, prev.distanceM + f * (s.distanceM - prev.distanceM)), completed: true });
    } else {
      break;
    }
  }
  return { boundaries, last: s };
}

/** "다음 구간" 버튼 (직접 넘기는 구간). 지금 지점에서 닫는다 */
export function nextIntervalStep(flat: FlatStep[], track: IntervalTrack, sample: IntervalSample): IntervalTrack {
  const t = advanceInterval(flat, track, sample);
  if (t.boundaries.length >= flat.length || !t.last) return t;
  return { ...t, boundaries: [...t.boundaries, { ...t.last, completed: true }] };
}

/**
 * 달리기를 끝낼 때: 하던 구간을 그 지점까지 끝내지 못한 구간으로 남긴다 (막 시작했어도 남긴다).
 * 그래서 마지막 구간이 completed면 인터벌을 끝까지 마친 것이다
 */
export function closeInterval(flat: FlatStep[], track: IntervalTrack, sample: IntervalSample): IntervalTrack {
  const t = advanceInterval(flat, track, sample);
  if (t.boundaries.length >= flat.length || !t.last) return t;
  return { ...t, boundaries: [...t.boundaries, { ...t.last, completed: false }] };
}

/** 구간 결과로 본 인터벌 완주 여부 (마지막 구간을 조건대로 마쳤나) */
export function workoutFinished(steps: { completed: boolean }[]): boolean {
  return steps.length > 0 && steps[steps.length - 1].completed;
}

export function intervalDone(flat: FlatStep[], boundaries: StepBoundary[]): boolean {
  return flat.length > 0 && boundaries.length >= flat.length;
}

/** 닫은 구간별 실제 거리 · 시간 */
export function stepResults(flat: FlatStep[], boundaries: StepBoundary[]): StepResult[] {
  return boundaries.slice(0, flat.length).map((b, i) => {
    const start = stepStart(boundaries, i);
    return {
      ...flat[i],
      distanceM: Math.max(0, Math.round(b.distanceM - start.distanceM)),
      elapsedSec: Math.max(0, Math.round((b.activeMs - start.activeMs) / 1000)),
      completed: b.completed,
    };
  });
}

export type IntervalRemaining = { kind: 'distance'; m: number } | { kind: 'time'; sec: number } | { kind: 'manual' };

// 지금 하는 구간 (HUD). done이면 모든 구간을 마쳤다
export type IntervalNow = {
  index: number;
  step: FlatStep | null;
  next: FlatStep | null;
  elapsedSec: number;
  distanceM: number;
  remaining: IntervalRemaining;
  // 구간 진행 0~1 (직접 넘기는 구간은 null)
  progress: number | null;
  done: boolean;
};

export function intervalNow(flat: FlatStep[], boundaries: StepBoundary[], sample: IntervalSample): IntervalNow {
  const index = Math.min(boundaries.length, flat.length);
  const step = flat[index] ?? null;
  const start = stepStart(boundaries, index);
  const elapsedSec = Math.max(0, (sample.activeMs - start.activeMs) / 1000);
  const distanceM = Math.max(0, sample.distanceM - start.distanceM);
  let remaining: IntervalRemaining = { kind: 'manual' };
  let progress: number | null = null;
  if (step?.endConditionType === 'DISTANCE') {
    const v = step.endConditionValue ?? 0;
    remaining = { kind: 'distance', m: Math.max(0, v - distanceM) };
    progress = v > 0 ? Math.min(1, distanceM / v) : 1;
  } else if (step?.endConditionType === 'TIME') {
    const v = step.endConditionValue ?? 0;
    remaining = { kind: 'time', sec: Math.max(0, v - elapsedSec) };
    progress = v > 0 ? Math.min(1, elapsedSec / v) : 1;
  }
  return { index, step, next: flat[index + 1] ?? null, elapsedSec, distanceM, remaining, progress, done: step == null && flat.length > 0 };
}

// 목표와의 차이. unit sec: 목표 시간과의 차이(초), pace: 목표 페이스와의 차이(1km당 초). + 느림 · − 빠름 · 0 목표 안
export type TargetGap = { unit: 'sec' | 'pace'; gap: number };

function outside(value: number, min: number | null, max: number | null): number {
  if (max != null && value > max) return value - max;
  if (min != null && value < min) return value - min;
  return 0;
}

/**
 * 구간 목표와 비교. 목표 시간은 지금까지 달린 거리 비율만큼 나눈 시간과 비교한다 (400m 목표 1:30이면 200m에서 45초).
 * 거리가 minSampleM보다 짧으면 판단하지 않는다 (51.2장 초기 구간은 '--')
 */
export function targetGap(step: WorkoutStep, elapsedSec: number, distanceM: number, minSampleM: number): TargetGap | null {
  if (!step.targetType || distanceM < minSampleM || distanceM <= 0) return null;
  if (step.targetType === 'TARGET_TIME') {
    if (step.endConditionType !== 'DISTANCE' || !step.endConditionValue) return null;
    const ratio = Math.min(1, distanceM / step.endConditionValue);
    const scale = (v: number | null) => (v == null ? null : v * ratio);
    return { unit: 'sec', gap: outside(elapsedSec, scale(step.targetMin), scale(step.targetMax)) };
  }
  return { unit: 'pace', gap: outside(elapsedSec / (distanceM / 1000), step.targetMin, step.targetMax) };
}

/** 끝난 구간의 목표 판정 (결과 화면) */
export function resultGap(r: StepResult, minSampleM: number): TargetGap | null {
  return targetGap(r, r.elapsedSec, r.distanceM, minSampleM);
}
