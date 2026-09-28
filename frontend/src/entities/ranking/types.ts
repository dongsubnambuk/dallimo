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
