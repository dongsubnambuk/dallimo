import { distanceM, type GeoPoint } from '@/shared/geo';

import type { RunPolicy } from './policy';

// CRUN-002 코스 기준 진행률, CRUN-003 지속 이탈 안내에 쓰는 화면용 계산.
// 공식 완주 판정(CRUN-004 StartPoint/EndPoint/RouteMatch Verifier)은 서버가 한다. 여기 값은 러닝 중 표시용이다.

export type CourseTrack = {
  route: GeoPoint[];
  // route[i]까지 누적 거리(m)
  cum: number[];
  lengthM: number;
};

export type CourseProgressState = {
  // 코스 위에서 지금까지 온 거리(m). 뒤로 가지 않는다.
  progressM: number;
  // 코스 선에서 떨어진 거리(m)
  offsetM: number;
  // 이탈 거리 기준을 처음 넘은 시각(ms). 기준 안이면 null.
  offSince: number | null;
  // 이탈이 기준 시간 이상 이어졌는지 (지속 이탈)
  offRoute: boolean;
  // 코스 끝에 닿은 시점의 active 경과(ms)
  completedActiveMs: number | null;
};

// 되돌아가는 코스·교차 구간에서 엉뚱한 구간에 붙지 않도록 지금 위치 앞뒤 구간에서만 찾는다 (26.3장)
const LOOK_BACK_M = 30;
const LOOK_AHEAD_M = 250;

export function createCourseTrack(route: GeoPoint[]): CourseTrack {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + distanceM(route[i - 1], route[i]));
  return { route, cum, lengthM: cum[cum.length - 1] };
}

export const initialCourseProgress = (): CourseProgressState => ({ progressM: 0, offsetM: 0, offSince: null, offRoute: false, completedActiveMs: null });

/** 정확도가 괜찮은 point 하나를 반영한다. at: point 시각(ms), activeMs: 그 시점 active 경과. */
export function advanceCourse(track: CourseTrack, s: CourseProgressState, p: GeoPoint, at: number, activeMs: number, policy: RunPolicy): CourseProgressState {
  if (s.completedActiveMs != null) return s;
  const { route, cum } = track;
  let best = { d: Infinity, along: s.progressM };
  for (let i = 1; i < route.length; i++) {
    if (cum[i] < s.progressM - LOOK_BACK_M || cum[i - 1] > s.progressM + LOOK_AHEAD_M) continue;
    const { d, t } = projectToSegment(p, route[i - 1], route[i]);
    if (d < best.d) best = { d, along: cum[i - 1] + t * (cum[i] - cum[i - 1]) };
  }

  const offsetM = best.d;
  const within = offsetM <= policy.courseDeviationM;
  // 코스 위에 있을 때만 진행률을 올린다. 이탈 중에는 마지막 진행률을 유지한다.
  const progressM = within ? Math.max(s.progressM, best.along) : s.progressM;
  const offSince = within ? null : (s.offSince ?? at);
  const offRoute = offSince != null && at - offSince >= policy.courseDeviationSec * 1000;
  // 마지막 구간 끝까지 투영되면(끝점을 지나면) 완주로 본다
  const completedActiveMs = within && progressM >= track.lengthM - 0.5 ? activeMs : null;
  return { progressM, offsetM, offSince, offRoute, completedActiveMs };
}

// 짧은 거리라 위경도를 평면으로 보고 투영한다
function projectToSegment(p: GeoPoint, a: GeoPoint, b: GeoPoint): { d: number; t: number } {
  const k = Math.cos((a.latitude * Math.PI) / 180);
  const ax = a.longitude * k;
  const ay = a.latitude;
  const bx = b.longitude * k - ax;
  const by = b.latitude - ay;
  const px = p.longitude * k - ax;
  const py = p.latitude - ay;
  const len2 = bx * bx + by * by;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
  const q = { latitude: ay + t * by, longitude: (ax + t * bx) / k };
  return { d: distanceM(p, q), t };
}

/**
 * 목표 기록과의 시간 차이(초). 양수면 목표보다 느림.
 * 목표 기록의 구간별 기록이 없어 목표를 코스 전체에 고르게 나눈 페이스로 본다 (FOUNDATION-DECISION-LOG 16항).
 */
export function targetGapSec(progressM: number, lengthM: number, elapsedSec: number, targetSec: number): number {
  return elapsedSec - (targetSec * progressM) / lengthM;
}
