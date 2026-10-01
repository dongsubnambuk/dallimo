import type { CourseSummary } from '@/entities/course/types';
import type { RunnerProfile, RunnerTime } from '@/entities/user/types';
import { DISTANCE_MID_M, labelOf } from '@/features/onboarding/runnerOptions';
import { formatDistanceKm } from '@/shared/format';

// CRS-005 추천 코스: 초기 규칙 기반 (명세 "초기 규칙 기반 추천").
// 평소 달리는 거리와 비슷한지 + 완주자 평점 + 이번 주 달린 사람 + 가까운지 + 아직 안 달린 코스인지를 더해 고른다.
// 규칙과 가중치는 명세에 값이 없어 정한 시작값 (FOUNDATION-DECISION-LOG 41항).
// 온보딩 러너 정보(결정 로그 64항): 기록이 없으면 고른 평소 거리를 쓰고, 러닝 경험 · 주로 달리는 시간에 맞는 코스를 조금 더 올린다.

export type Recommendation = { course: CourseSummary; reason: string };

// 평소 거리를 모를 때 기준 (처음 달리는 사람이 많이 고르는 거리)
const DEFAULT_MIN_M = 3000;
const DEFAULT_MAX_M = 5000;
// 이 거리 안이면 "가깝다"
const NEAR_M = 3000;

// 코스 추천 시간(자유 입력, 예: "새벽 · 저녁")에서 시간대를 찾는 말
const TIME_WORDS: Record<RunnerTime, string[]> = {
  MORNING: ['새벽', '아침', '오전'],
  DAYTIME: ['낮', '오후', '점심'],
  EVENING: ['저녁', '퇴근', '해질'],
  NIGHT: ['밤', '야간'],
};

type Parts = { fit: number; rating: number; social: number; near: number; fresh: number; level: number; time: number };

/** typicalDistanceM: 최근 러닝 거리의 가운데 값. 기록이 없으면 null */
export function recommendCourses(courses: CourseSummary[], typicalDistanceM: number | null, limit = 1, runner?: RunnerProfile | null): Recommendation[] {
  if (!courses.length) return [];
  // 실제 기록이 고른 값보다 정확하다. 기록이 없을 때만 온보딩에서 고른 평소 거리를 쓴다
  const typical = typicalDistanceM ?? (runner?.distance ? DISTANCE_MID_M[runner.distance] : null);
  const fromRecords = typicalDistanceM != null;
  const maxWeekly = Math.max(1, ...courses.map((c) => c.weeklyRunnerCount));
  const scored = courses.map((c) => {
    const p = parts(c, typical, maxWeekly, runner ?? null);
    const score = p.fit * 2 + p.rating + p.social + p.near + p.fresh + p.level + p.time;
    return { course: c, score, reason: reasonOf(c, p, typical, fromRecords, runner ?? null) };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.course.id.localeCompare(b.course.id))
    .slice(0, limit)
    .map(({ course, reason }) => ({ course, reason }));
}

function parts(c: CourseSummary, typical: number | null, maxWeekly: number, runner: RunnerProfile | null): Parts {
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
  return { fit, rating, social, near, fresh, level: levelFit(c, runner), time: timeFit(c, runner) };
}

// 이제 시작한 사람에게는 쉬운 코스를, 꾸준히 달리는 사람에게는 어려운 코스를 조금 더 올린다. 모르면 0
function levelFit(c: CourseSummary, runner: RunnerProfile | null): number {
  const easy = c.difficulty === 'EASY' || c.tags.includes('초보 추천');
  if (runner?.experience === 'BEGINNER') return easy ? 0.8 : c.difficulty === 'HARD' ? -0.8 : 0;
  if (runner?.experience === 'REGULAR') return c.difficulty === 'HARD' || c.difficulty === 'MODERATE' ? 0.4 : 0;
  return 0;
}

// 주로 달리는 시간과 코스 추천 시간이 맞으면 올린다. 밤에 달리는 사람에게는 "야간 밝음" 코스도
function timeFit(c: CourseSummary, runner: RunnerProfile | null): number {
  const t = runner?.preferredTime;
  if (!t) return 0;
  if (c.recommendedTime && TIME_WORDS[t].some((w) => c.recommendedTime!.includes(w))) return 0.6;
  if (t === 'NIGHT' && c.tags.includes('야간 밝음')) return 0.6;
  return 0;
}

// 가장 크게 기여한 이유 하나를 말로
function reasonOf(c: CourseSummary, p: Parts, typical: number | null, fromRecords: boolean, runner: RunnerProfile | null): string {
  const fitCopy = !typical ? '처음 달리기 좋은 3~5km예요' : fromRecords ? `평소 달리는 ${formatDistanceKm(typical, 1)}km와 비슷해요` : `평소 달리는 ${labelOf.distance(runner!.distance!)}에 맞아요`;
  const candidates: [number, string][] = [
    [p.fit * 2, fitCopy],
    [p.rating, `완주자 평점 ${c.ratingAvg?.toFixed(1)}`],
    [p.social, `이번 주 ${c.weeklyRunnerCount}명이 달렸어요`],
    [p.near, '출발점이 가까워요'],
    [p.fresh, '아직 달려 보지 않은 코스예요'],
    // 경험 · 시간 이유는 다른 이유보다 앞서야 할 만큼 맞을 때만 (fit 만점 2를 넘지 않는다)
    [p.level * 2, runner?.experience === 'BEGINNER' ? '처음 달리기 좋은 쉬운 코스예요' : '꾸준히 달리는 러너에게 맞는 난도예요'],
    [p.time * 2, runner?.preferredTime ? `${labelOf.time(runner.preferredTime)}에 달리기 좋은 코스예요` : ''],
  ];
  return candidates.filter(([, copy]) => copy).sort((a, b) => b[0] - a[0])[0][1];
}

/** 최근 러닝 거리의 가운데 값 (짧은 기록 몇 개에 흔들리지 않게 평균 대신) */
export function typicalDistance(distances: number[]): number | null {
  const d = distances.filter((x) => x >= 500).sort((a, b) => a - b);
  if (!d.length) return null;
  const mid = Math.floor(d.length / 2);
  return d.length % 2 ? d[mid] : Math.round((d[mid - 1] + d[mid]) / 2);
}
