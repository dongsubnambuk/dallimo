import { formatDuration, formatDurationSpoken, formatPace } from '@/shared/format';

import type { FlatStep, StepType, WorkoutBlock, WorkoutStep } from './types';

// 사용자 결정 (FOUNDATION-DECISION-LOG 40항): 무엇을 하는지 바로 알 수 있는 말
export const STEP_LABEL: Record<StepType, string> = {
  WARMUP: '몸풀기',
  WORK: '빠르게',
  RECOVERY: '천천히',
  COOLDOWN: '마무리',
};

/** 400 → "400m", 1000 → "1km", 1500 → "1.5km" */
export function formatStepDistance(m: number): string {
  if (m < 1000) return `${m}m`;
  const km = m / 1000;
  return `${Number.isInteger(km) ? km : km.toFixed(2).replace(/0$/, '')}km`;
}

/** 90 → "1:30", 120 → "2분", 45 → "45초" */
export function formatStepTime(sec: number): string {
  if (sec < 60) return `${sec}초`;
  return sec % 60 === 0 ? `${sec / 60}분` : formatDuration(sec);
}

/** 끝나는 조건: "400m" · "2분" · "직접 넘기기" */
export function endLabel(s: WorkoutStep): string {
  if (s.endConditionType === 'DISTANCE') return formatStepDistance(s.endConditionValue ?? 0);
  if (s.endConditionType === 'TIME') return formatStepTime(s.endConditionValue ?? 0);
  return '직접 넘기기';
}

/** 목표: "목표 1:30" · "최대 1:30" · "페이스 4'30\"" · "페이스 4'30\"~4'50\"". 없으면 null */
export function targetLabel(s: WorkoutStep): string | null {
  if (!s.targetType) return null;
  const fmt = s.targetType === 'TARGET_TIME' ? formatDuration : formatPace;
  const { targetMin: min, targetMax: max } = s;
  if (s.targetType === 'TARGET_PACE') {
    if (min != null && max != null) return min === max ? `페이스 ${fmt(min)}` : `페이스 ${fmt(min)}~${fmt(max)}`;
    if (max != null) return `페이스 ${fmt(max)}보다 빠르게`;
    return min != null ? `페이스 ${fmt(min)}보다 느리게` : null;
  }
  if (min != null && max != null) return min === max ? `목표 ${fmt(min)}` : `목표 ${fmt(min)}~${fmt(max)}`;
  if (max != null) return `최대 ${fmt(max)}`;
  return min != null ? `최소 ${fmt(min)}` : null;
}

/** "빠르게 400m · 목표 1:30" */
export function stepLabel(s: WorkoutStep): string {
  const t = targetLabel(s);
  return `${STEP_LABEL[s.stepType]} ${endLabel(s)}${t ? ` · ${t}` : ''}`;
}

/** 반복 안 구간: "빠르게 2/5" */
export function flatStepTitle(s: FlatStep): string {
  return s.repeatIndex != null ? `${STEP_LABEL[s.stepType]} ${s.repeatIndex}/${s.repeatCount}` : STEP_LABEL[s.stepType];
}

/** 구성 한 줄: "몸풀기 1km · (빠르게 400m → 천천히 200m) × 5 · 마무리 1km" */
export function summarizeBlocks(blocks: WorkoutBlock[]): string {
  return blocks
    .map((b) => {
      const inner = b.steps.map((s) => `${STEP_LABEL[s.stepType]} ${endLabel(s)}`).join(' → ');
      if (b.type !== 'REPEAT') return inner;
      return b.steps.length > 1 ? `(${inner}) × ${b.repeatCount}` : `${inner} × ${b.repeatCount}`;
    })
    .join(' · ');
}

/** 전체 양: "총 4.0km", "총 16분", "총 2.2km + 8분". 직접 넘기는 구간은 셀 수 없어 뺀다 */
export function totalLabel(blocks: WorkoutBlock[]): string {
  let m = 0;
  let sec = 0;
  for (const b of blocks) {
    const times = b.type === 'REPEAT' ? b.repeatCount : 1;
    for (const s of b.steps) {
      if (s.endConditionType === 'DISTANCE') m += (s.endConditionValue ?? 0) * times;
      if (s.endConditionType === 'TIME') sec += (s.endConditionValue ?? 0) * times;
    }
  }
  const parts = [m > 0 ? `${(m / 1000).toFixed(1)}km` : null, sec > 0 ? formatStepTime(sec) : null].filter(Boolean);
  return parts.length ? `총 ${parts.join(' + ')}` : '직접 넘기는 구간만 있어요';
}

/** 음성: "빠르게 400미터. 목표 1분 30초." */
export function spokenStep(s: WorkoutStep): string {
  const end =
    s.endConditionType === 'DISTANCE'
      ? spokenDistance(s.endConditionValue ?? 0)
      : s.endConditionType === 'TIME'
        ? formatDurationSpoken(s.endConditionValue ?? 0)
        : '다음 구간 버튼을 누를 때까지';
  const t = spokenTarget(s);
  return `${STEP_LABEL[s.stepType]} ${end}.${t ? ` ${t}.` : ''}`;
}

function spokenTarget(s: WorkoutStep): string | null {
  if (!s.targetType) return null;
  const { targetMin: min, targetMax: max } = s;
  if (s.targetType === 'TARGET_TIME') {
    if (min != null && max != null && min === max) return `목표 ${formatDurationSpoken(min)}`;
    if (max != null && min == null) return `최대 ${formatDurationSpoken(max)}`;
    if (min != null && max != null) return `목표 ${formatDurationSpoken(min)}에서 ${formatDurationSpoken(max)}`;
    return min != null ? `최소 ${formatDurationSpoken(min)}` : null;
  }
  const pace = (v: number) => `${formatDurationSpoken(v)}`;
  if (min != null && max != null && min === max) return `페이스 ${pace(min)}`;
  if (min != null && max != null) return `페이스 ${pace(min)}에서 ${pace(max)}`;
  if (max != null) return `페이스 ${pace(max)}보다 빠르게`;
  return min != null ? `페이스 ${pace(min)}보다 느리게` : null;
}

export function spokenDistance(m: number): string {
  if (m < 1000) return `${m}미터`;
  const km = m / 1000;
  return `${Number.isInteger(km) ? km : km.toFixed(1)}킬로미터`;
}
