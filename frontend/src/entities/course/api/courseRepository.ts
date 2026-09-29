import type { CourseDetail, CourseReview, CourseSummary, MyCourse, MyCourseKind, NearbyCourseQuery, ReportReason, ReviewInput } from '@/entities/course/types';

// 119장: API가 없는 단계에서도 화면이 서버 응답 구조에 직접 묶이지 않도록 repository 경계를 둔다.
// 실제 API가 생기면 이 인터페이스의 구현만 바꾼다.
export interface CourseRepository {
  getNearby(query: NearbyCourseQuery): Promise<CourseSummary[]>;
  // 비공개·숨김 코스는 CourseRepositoryError('hidden')
  getDetail(id: string): Promise<CourseDetail>;
  // CRS-105 코스 저장 · 저장 해제 (POST · DELETE /courses/{id}/bookmarks)
  setBookmark(id: string, saved: boolean): Promise<void>;
  // MY-005 내 코스. 41~43장 표에 경로가 아직 없어 OpenAPI 확정 시 맞춘다.
  getMine(kind: MyCourseKind): Promise<MyCourse[]>;
  // CRS-003 이름 · 지역 · 태그 검색 (GET /courses/search, 최근 등록순)
  search(query: string): Promise<CourseSummary[]>;
  // REV-001 평가 목록 (최근 먼저) · 쓰기(다시 쓰면 바뀐다) · 지우기
  getReviews(courseId: string, cursor: string | null): Promise<{ items: CourseReview[]; nextCursor: string | null }>;
  writeReview(courseId: string, input: ReviewInput): Promise<CourseReview>;
  deleteReview(courseId: string): Promise<void>;
  // CREG-005 신고 (한 사람 한 번, 다시 하면 사유가 바뀐다)
  report(courseId: string, reason: ReportReason, content: string | null): Promise<void>;
}

export class CourseRepositoryError extends Error {
  constructor(
    // invalid: 코스 등록 거부 (43.1장 RunPoint 부족, 내 기록이 아님 등)
    readonly kind: 'network' | 'server' | 'hidden' | 'notFound' | 'invalid',
    message: string,
  ) {
    super(message);
  }
}
