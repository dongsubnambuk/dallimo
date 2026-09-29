import { spokenDistance, spokenStep, STEP_LABEL } from '@/entities/workout/labels';
import type { TargetGap } from '@/entities/workout/tracker';
import type { FlatStep, StepResult, WorkoutStep } from '@/entities/workout/types';
import { formatDurationSpoken } from '@/shared/format';

// 인터벌 달리기 음성 (123.2장 "오디오/진동 Cue는 구간 전환 시", 129장 "화면을 보지 않아도 Step 전환을 이해").
// 구간이 끝나면 방금 구간 결과 한 줄 + 다음 구간을 읽는다. 짧고 행동할 수 있는 말로 (REFERENCE-MATRIX Voice).

/** "인터벌 시작. 몸풀기 1킬로미터." */
export function startSentence(first: FlatStep): string {
  return `인터벌 시작. ${spokenStep(first)}`;
}

/** 목표와 비교 한 마디. 목표가 없으면 null */
export function gapWords(step: WorkoutStep, gap: TargetGap | null): string | null {
  if (!gap || !step.targetType) return null;
  const exact = step.targetMin != null && step.targetMin === step.targetMax;
  const what = gap.unit === 'pace' ? '목표 페이스' : '목표';
  const g = Math.round(gap.gap);
  if (g === 0) return exact ? `${what}와 같아요` : step.targetMin == null ? '최대 시간 안이에요' : '목표 안이에요';
  return `${what}보다 ${formatDurationSpoken(Math.abs(g))} ${g < 0 ? '빨라요' : '느려요'}`;
}

/** 끝난 구간: "빠르게 끝. 1분 28초. 목표보다 2초 빨라요." 시간 구간이면 달린 거리 */
export function stepEndSentence(r: StepResult, gap: TargetGap | null): string {
  const measure = r.endConditionType === 'TIME' ? spokenDistance(r.distanceM) : formatDurationSpoken(r.elapsedSec);
  const g = gapWords(r, gap);
  return `${STEP_LABEL[r.stepType]} 끝. ${measure}.${g ? ` ${g}.` : ''}`;
}

/** "다음, 천천히 200미터. 최대 1분 30초." 반복의 첫 구간이면 몇 번째인지 */
export function nextSentence(next: FlatStep): string {
  const round = next.repeatIndex != null && next.repeatCount != null ? `${next.repeatCount}번 중 ${next.repeatIndex}번째. ` : '';
  return `다음, ${round}${spokenStep(next)}`;
}

export const DONE_SENTENCE = '인터벌 끝. 수고했어요. 인터벌 기록 저장을 누르면 끝나요.';

// 빠르게 구간이 끝나 갈 때 한 번: 거리 구간은 400m 이상이면 100m 남기고, 시간 구간은 1분 이상이면 10초 남기고
export const WORK_NEAR_END = { distanceM: 100, minDistanceM: 400, sec: 10, minSec: 60 };

export function nearEndSentence(step: FlatStep): string | null {
  if (step.stepType !== 'WORK') return null;
  if (step.endConditionType === 'DISTANCE' && (step.endConditionValue ?? 0) >= WORK_NEAR_END.minDistanceM) return `${WORK_NEAR_END.distanceM}미터 남았어요`;
  if (step.endConditionType === 'TIME' && (step.endConditionValue ?? 0) >= WORK_NEAR_END.minSec) return `${WORK_NEAR_END.sec}초 남았어요`;
  return null;
}
