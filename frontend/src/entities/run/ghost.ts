import type { GhostRun } from '@/entities/ranking/types';

import { targetGapSec } from './courseProgress';

// 124장 Ghost / Pace Chase: 목표 기록을 코스 전체에 고르게 나눈 페이스(16항) 대신, 실제 기록이 코스 어디를 몇 초에 지났는지와 비교한다.
// 고스트가 없으면(기록 point가 없음 · 오프라인) 예전처럼 고르게 나눈 페이스로 본다.

export type ChaseTarget = { sec: number; label: string; ghost?: GhostRun | null };

/** 고스트가 코스 위 progressM(내 코스 길이 기준)을 지난 초 */
export function ghostSecAt(g: GhostRun, fraction: number): number {
  const at = Math.max(0, Math.min(1, fraction)) * g.courseLengthM;
  const s = g.samples;
  for (let i = 1; i < s.length; i++) {
    if (s[i][0] < at) continue;
    const [m0, t0] = s[i - 1];
    const [m1, t1] = s[i];
    return m1 === m0 ? t1 : t0 + ((t1 - t0) * (at - m0)) / (m1 - m0);
  }
  return g.timeSec;
}

/** sec초에 고스트가 있는 코스 위 비율 (0~1) */
export function ghostFractionAt(g: GhostRun, sec: number): number {
  const s = g.samples;
  if (sec <= 0 || s.length < 2) return 0;
  for (let i = 1; i < s.length; i++) {
    if (s[i][1] < sec) continue;
    const [m0, t0] = s[i - 1];
    const [m1, t1] = s[i];
    const m = t1 === t0 ? m1 : m0 + ((m1 - m0) * (sec - t0)) / (t1 - t0);
    return Math.min(1, m / g.courseLengthM);
  }
  return 1;
}

/** 목표와 차이(초, + 뒤처짐). 고스트가 있으면 같은 지점을 지난 시각, 없으면 고르게 나눈 페이스 */
export function chaseGapSec(progressM: number, lengthM: number, elapsedSec: number, target: ChaseTarget): number {
  if (target.ghost && target.ghost.samples.length > 1 && lengthM > 0) return elapsedSec - ghostSecAt(target.ghost, progressM / lengthM);
  return targetGapSec(progressM, lengthM, elapsedSec, target.sec);
}

/** 고스트와 거리 차이(m, + 앞섬). 고스트가 없으면 null */
export function chaseGapM(progressM: number, lengthM: number, elapsedSec: number, target: ChaseTarget): number | null {
  if (!target.ghost || target.ghost.samples.length < 2 || lengthM <= 0) return null;
  return progressM - ghostFractionAt(target.ghost, elapsedSec) * lengthM;
}
