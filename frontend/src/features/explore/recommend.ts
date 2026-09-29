import type { CourseSummary } from '@/entities/course/types';
import { formatDistanceKm } from '@/shared/format';

// CRS-005 추천 코스: 초기 규칙 기반 (명세 "초기 규칙 기반 추천").
// 평소 달리는 거리와 비슷한지 + 완주자 평점 + 이번 주 달린 사람 + 가까운지 + 아직 안 달린 코스인지를 더해 고른다.
// 규칙과 가중치는 명세에 값이 없어 정한 시작값 (FOUNDATION-DECISION-LOG 41항).

export type Recommendation = { course: CourseSummary; reason: string };

// 평소 거리를 모를 때 기준 (처음 달리는 사람이 많이 고르는 거리)
const DEFAULT_MIN_M = 3000;
const DEFAULT_MAX_M = 5000;
// 이 거리 안이면 "가깝다"
const NEAR_M = 3000;

type Parts = { fit: number; rating: number; social: number; near: number; fresh: number };

/** typicalDistanceM: 최근 러닝 거리의 가운데 값. 기록이 없으면 null */
export function recommendCourses(courses: CourseSummary[], typicalDistanceM: number | null, limit = 1): Recommendation[] {
  if (!courses.length) return [];
  const maxWeekly = Math.max(1, ...courses.map((c) => c.weeklyRunnerCount));
  const scored = courses.map((c) => {
    const p = parts(c, typicalDistanceM, maxWeekly);
    const score = p.fit * 2 + p.rating + p.social + p.near + p.fresh;
    return { course: c, score, reason: reasonOf(c, p, typicalDistanceM) };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.course.id.localeCompare(b.course.id))
    .slice(0, limit)
    .map(({ course, reason }) => ({ course, reason }));
}

function parts(c: CourseSummary, typical: number | null, maxWeekly: number): Parts {
  const fit = typical
    ? 1 - Math.min(1, Math.abs(c.distanceM - typical) / typical)
    : c.distanceM >= DEFAULT_MIN_M && c.distanceM <= DEFAULT_MAX_M
      ? 1
      : 0.4;
  // 평가가 있어야 평점을 본다 (3점이 0, 5점이 1)
  const rating = c.ratingAvg != null && c.reviewCount > 0 ? Math.max(0, Math.min(1, (c.ratingAvg - 3) / 2)) : 0;
  const social = Math.log1p(c.weeklyRunnerCount) / Math.log1p(maxWeekly);
  const near = c.startDistanceM != null ? 1 - Math.min(1, c.startDistanceM / NEAR_M) : 0;
  const fresh = c.myBestSec == null ? 0.5 : 0;
  return { fit, rating, social, near, fresh };
}

// 가장 크게 기여한 이유 하나를 말로
function reasonOf(c: CourseSummary, p: Parts, typical: number | null): string {
  const candidates: [number, string][] = [
    [p.fit * 2, typical ? `평소 달리는 ${formatDistanceKm(typical, 1)}km와 비슷해요` : '처음 달리기 좋은 3~5km예요'],
    [p.rating, `완주자 평점 ${c.ratingAvg?.toFixed(1)}`],
    [p.social, `이번 주 ${c.weeklyRunnerCount}명이 달렸어요`],
    [p.near, '출발점이 가까워요'],
    [p.fresh, '아직 달려 보지 않은 코스예요'],
  ];
  return candidates.sort((a, b) => b[0] - a[0])[0][1];
}

/** 최근 러닝 거리의 가운데 값 (짧은 기록 몇 개에 흔들리지 않게 평균 대신) */
export function typicalDistance(distances: number[]): number | null {
  const d = distances.filter((x) => x >= 500).sort((a, b) => a - b);
  if (!d.length) return null;
  const mid = Math.floor(d.length / 2);
  return d.length % 2 ? d[mid] : Math.round((d[mid - 1] + d[mid]) / 2);
}
