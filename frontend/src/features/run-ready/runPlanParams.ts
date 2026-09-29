import type { RunMode, RunPlan } from '@/entities/run/types';
import { parseWorkoutPlan, serializeWorkoutPlan } from '@/entities/workout/plan';
import type { WorkoutPlan } from '@/entities/workout/types';

// Play Mode → Run Ready → Run Start로 RunPlan을 route params(문자열)로 넘긴다.
export type RunPlanParams = {
  mode?: string;
  courseId?: string;
  courseName?: string;
  targetSec?: string;
  targetLabel?: string;
  // CHALLENGE: 도전할 친구 기록 id (Run Ready에서 도전을 만든다), 만든 도전 id (기록 동기화가 서버 Run에 잇는다)
  targetRecordId?: string;
  challengeId?: string;
  // INTERVAL: 달릴 인터벌 (WorkoutPlan JSON). 앱이 꺼졌다 켜져도 이 값으로 구간을 다시 안다
  workout?: string;
};

// 코스 없이 시작하면 FREE (RUN-001 빠른 러닝). 인터벌을 고르면 INTERVAL (123장, 코스 없이)
export type ReadyPlan = { kind: 'free' } | { kind: 'course'; plan: RunPlan; courseName: string | null } | { kind: 'interval'; workout: WorkoutPlan };

const COURSE_MODES: RunMode[] = ['COURSE', 'PB', 'CHALLENGE'];

export function parseRunPlan(p: RunPlanParams): ReadyPlan {
  if (p.mode === 'INTERVAL') {
    const workout = parseWorkoutPlan(p.workout);
    if (workout) return { kind: 'interval', workout };
  }
  const mode = COURSE_MODES.find((m) => m === p.mode);
  if (!mode || !p.courseId) return { kind: 'free' };
  const targetSec = p.targetSec != null && p.targetSec !== '' ? Number(p.targetSec) : NaN;
  return {
    kind: 'course',
    courseName: p.courseName ?? null,
    plan: {
      mode,
      courseId: p.courseId,
      ...(Number.isFinite(targetSec) && mode !== 'COURSE' ? { targetSec, targetLabel: p.targetLabel } : {}),
      ...(mode === 'CHALLENGE' && p.targetRecordId ? { targetRecordId: p.targetRecordId } : {}),
    },
  };
}

export function workoutParams(w: WorkoutPlan): RunPlanParams {
  return { mode: 'INTERVAL', workout: serializeWorkoutPlan(w) };
}

export function toRunPlanParams(plan: ReadyPlan, courseName?: string | null): RunPlanParams {
  if (plan.kind === 'free') return { mode: 'FREE' };
  if (plan.kind === 'interval') return workoutParams(plan.workout);
  const { mode, courseId, targetSec, targetLabel, targetRecordId } = plan.plan;
  return {
    mode,
    courseId,
    ...(courseName ? { courseName } : {}),
    ...(targetSec != null ? { targetSec: String(targetSec), targetLabel } : {}),
    ...(targetRecordId ? { targetRecordId } : {}),
  };
}

// 64장 PICK A PLAY MODE 사용자 노출 이름 (PlayModeSheet와 같은 말)
export const MODE_TITLE: Record<RunMode, string> = {
  FREE: '자유 달리기',
  COURSE: '완주',
  PB: 'PB 어택',
  CHALLENGE: '라이벌',
  LIVE_RACE: '라이브 레이스',
  TIME_ATTACK: '타임 어택',
  TOGETHER: '함께',
  INTERVAL: '인터벌 달리기',
};
