import type { WorkoutBlock, WorkoutStep } from './types';

// 서버 WorkoutDefinition과 같은 범위 (명세에 없어 정한 시작값, backend/README · FOUNDATION-DECISION-LOG 45항)
export const WORKOUT_LIMITS = {
  nameMax: 40,
  descriptionMax: 200,
  maxBlocks: 20,
  maxStepsInRepeat: 10,
  minRepeat: 2,
  maxRepeat: 30,
  maxFlatSteps: 200,
  minDistanceM: 50,
  maxDistanceM: 50_000,
  minTimeSec: 10,
  maxTimeSec: 3 * 60 * 60,
  minTargetSec: 10,
  maxTargetSec: 10 * 60 * 60,
  minPaceSec: 2 * 60,
  maxPaceSec: 20 * 60,
  maxTemplates: 50,
};

const L = WORKOUT_LIMITS;
const within = (v: number | null, min: number, max: number) => v != null && Number.isInteger(v) && v >= min && v <= max;

/** 구간 하나의 문제. 없으면 null */
export function stepProblem(s: WorkoutStep): string | null {
  if (s.endConditionType === 'DISTANCE' && !within(s.endConditionValue, L.minDistanceM, L.maxDistanceM)) return `거리는 ${L.minDistanceM}m ~ ${L.maxDistanceM / 1000}km로 정해 주세요`;
  if (s.endConditionType === 'TIME' && !within(s.endConditionValue, L.minTimeSec, L.maxTimeSec)) return `시간은 ${L.minTimeSec}초 ~ ${L.maxTimeSec / 3600}시간으로 정해 주세요`;
  if (!s.targetType) return null;
  if (s.targetMin == null && s.targetMax == null) return '목표 값을 정해 주세요';
  if (s.targetMin != null && s.targetMax != null && s.targetMin > s.targetMax) return '목표 최소가 최대보다 커요';
  if (s.targetType === 'TARGET_TIME') {
    if (s.endConditionType !== 'DISTANCE') return '목표 시간은 거리 구간에만 정할 수 있어요';
    if ([s.targetMin, s.targetMax].some((v) => v != null && !within(v, L.minTargetSec, L.maxTargetSec))) return '목표 시간이 범위를 벗어났어요';
  } else if ([s.targetMin, s.targetMax].some((v) => v != null && !within(v, L.minPaceSec, L.maxPaceSec))) {
    return "목표 페이스는 2'00\" ~ 20'00\"로 정해 주세요";
  }
  return null;
}

/** 전체 구성의 문제. 없으면 null */
export function blocksProblem(blocks: WorkoutBlock[]): string | null {
  if (blocks.length === 0) return '구간을 하나 이상 넣어 주세요';
  if (blocks.length > L.maxBlocks) return `구간 묶음은 ${L.maxBlocks}개까지 넣을 수 있어요`;
  let flat = 0;
  for (const b of blocks) {
    if (b.steps.length === 0) return '빈 반복 묶음이 있어요';
    if (b.type === 'REPEAT') {
      if (b.steps.length > L.maxStepsInRepeat) return `반복 묶음에는 구간을 ${L.maxStepsInRepeat}개까지 넣을 수 있어요`;
      if (!within(b.repeatCount, L.minRepeat, L.maxRepeat)) return `반복은 ${L.minRepeat}~${L.maxRepeat}회로 정해 주세요`;
    } else if (b.steps.length !== 1) {
      return '반복이 아닌 묶음에는 구간이 하나만 들어가요';
    }
    for (const s of b.steps) {
      const p = stepProblem(s);
      if (p) return p;
    }
    flat += b.steps.length * (b.type === 'REPEAT' ? b.repeatCount : 1);
  }
  return flat > L.maxFlatSteps ? `반복을 풀면 구간이 ${L.maxFlatSteps}개를 넘어요` : null;
}

/** "1:30" → 90, "90" → 90초, 틀리면 null. 목표 시간 · 페이스 · 시간 구간 입력 */
export function parseClock(text: string): number | null {
  const t = text.trim();
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const h = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(t);
  if (h) return Number(h[1]) * 3600 + Number(h[2]) * 60 + Number(h[3]);
  return /^\d{1,5}$/.test(t) ? Number(t) : null;
}
