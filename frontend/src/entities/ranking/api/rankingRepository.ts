import type { CourseSegments, CourseTitles, MyStanding, RankingPage, RankingPeriod, RankingQuery, RankingScope } from '../types';

// 119장 repository 경계. 실제 API가 생기면 구현만 바꾼다.
export interface RankingRepository {
  getPage(query: RankingQuery): Promise<RankingPage>;
  getMyStanding(courseId: string, scope: RankingScope, period: RankingPeriod): Promise<MyStanding>;
  // 124장 코스 크라운 · 로컬 레전드
  getTitles(courseId: string): Promise<CourseTitles>;
  // 124장 Segment Attack 구간 (구간 1위 · 내 최고)
  getSegments(courseId: string): Promise<CourseSegments>;
}

export class RankingRepositoryError extends Error {}
