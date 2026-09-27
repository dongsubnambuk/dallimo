import type { GeoPoint } from '@/shared/geo';

// 명세서 43장 GET /api/v1/courses/nearby 응답 CourseSummary의 앱 쪽 모델.
// 최종 필드는 OpenAPI 확정 시 맞춘다. 단위는 7.4장: 거리 meter 정수, 시간 second 정수.
export type CourseSummary = {
  id: string;
  name: string;
  distanceM: number;
  // 특징 태그. 예: "평지", "야간 밝음"
  tags: string[];
  // 내 위치에서 코스 시작점까지 거리. 위치를 모르면 null.
  startDistanceM: number | null;
  // 목록·지도 표시용으로 단순화한 경로 (77장: 원본 point 전체를 그리지 않는다)
  displayRoute: GeoPoint[];
  // 내 최고 기록(초). 기록이 없으면 null.
  myBestSec: number | null;
  // 평균 완주 기준 예상 소요 시간(초)
  estimatedSec: number;
  // 인증된 완주자 수
  finisherCount: number;
  // 이번 주 이 코스를 달린 러너 수 (탐색 지도 위 표시)
  weeklyRunnerCount: number;
};

export type NearbyCourseQuery = {
  center: GeoPoint;
  radiusM: number;
};
