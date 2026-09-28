import type { CourseDetail, CourseSummary, NearbyCourseQuery } from '@/entities/course/types';

// 119장: API가 없는 단계에서도 화면이 서버 응답 구조에 직접 묶이지 않도록 repository 경계를 둔다.
// 실제 API가 생기면 이 인터페이스의 구현만 바꾼다.
export interface CourseRepository {
  getNearby(query: NearbyCourseQuery): Promise<CourseSummary[]>;
  // 비공개·숨김 코스는 CourseRepositoryError('hidden')
  getDetail(id: string): Promise<CourseDetail>;
}

export class CourseRepositoryError extends Error {
  constructor(
    readonly kind: 'network' | 'server' | 'hidden' | 'notFound',
    message: string,
  ) {
    super(message);
  }
}
