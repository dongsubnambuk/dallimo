import type { MyStanding, RankingPage, RankingPeriod, RankingQuery, RankingScope } from '../types';

// 119장 repository 경계. 실제 API가 생기면 구현만 바꾼다.
export interface RankingRepository {
  getPage(query: RankingQuery): Promise<RankingPage>;
  getMyStanding(courseId: string, scope: RankingScope, period: RankingPeriod): Promise<MyStanding>;
}

export class RankingRepositoryError extends Error {}
