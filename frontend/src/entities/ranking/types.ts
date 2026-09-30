import type { CourseRankingEntry } from '@/entities/course/types';

// SCR-E04 코스 랭킹 (RNK-001~005). 43장 GET /api/v1/courses/{id}/rankings?scope,period,cursor,size → RankingEntry[]
// 공식 랭킹은 사용자별 최고 VERIFIED 기록만 쓴다 (1장, RNK-001, 23.1장).
export type RankingPeriod = 'all' | 'weekly' | 'monthly';
export type RankingScope = 'all' | 'friends';

export type RankingEntry = CourseRankingEntry & { userId: string };

export type RankingQuery = {
  courseId: string;
  scope: RankingScope;
  period: RankingPeriod;
  cursor: string | null;
  size: number;
};

export type RankingPage = {
  entries: RankingEntry[];
  nextCursor: string | null;
};

// RNK-005 내 주변 순위. 내 기록이 없으면 entry null(unranked).
export type MyStanding = {
  total: number;
  entry: RankingEntry | null;
  // 내 순위 바로 위·아래 사용자 (나 포함)
  around: RankingEntry[];
};

// 124장 코스 타이틀 (126장 GET /courses/{id}/crown · /local-legend). 최근 90일 검증 기록만 센다.
// Crown은 기록, Local Legend는 반복 참여를 보상한다 (둘을 합치지 않는다)
export type TitleHolder = { userId: string; name: string; profileImageUrl: string | null; relation: 'self' | 'friend' | 'normal' };

export type CourseCrown = {
  periodDays: number;
  holder: TitleHolder | null;
  timeSec: number | null;
  paceSecPerKm: number | null;
  // 기간 안 내 최고 기록과 크라운까지 남은 초 (내 기록이 없거나 비회원이면 null)
  me: { bestSec: number; gapSec: number; holder: boolean } | null;
};

export type LocalLegend = {
  periodDays: number;
  minFinishes: number;
  holder: TitleHolder | null;
  finishCount: number | null;
  // needed: 레전드가 되려면 더 달려야 하는 횟수 (지금 기준, 비회원이면 me null)
  me: { finishCount: number; needed: number; holder: boolean } | null;
};

export type CourseTitles = { crown: CourseCrown; legend: LocalLegend };

// 124장 Segment Attack (126장 GET /courses/{id}/segments). 서버가 코스를 약 1km씩 나눈다 (1.5km 미만 코스는 구간 없음)
export type CourseSegment = {
  // 0부터
  index: number;
  // 코스 위 위치(m, courseLengthM 기준)
  startM: number;
  endM: number;
  distanceM: number;
  // 구간 1위 (사용자별 최고, 전체 기간)
  leader: { userId: string; name: string; relation: 'self' | 'friend' | 'normal'; timeSec: number } | null;
  myBestSec: number | null;
  runnerCount: number;
};

export type CourseSegments = { courseLengthM: number; segments: CourseSegment[] };

/** "구간 1" */
export const segmentName = (index: number) => `구간 ${index + 1}`;
