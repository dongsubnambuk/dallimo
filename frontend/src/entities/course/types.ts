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
  // 코스 1위 인증 기록(초). 인증 기록이 없으면 null. (탐색에서 경쟁 동기를 보여준다, 64.1장 Competition-aware)
  leaderSec: number | null;
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

// ---- 코스 상세 (43장 GET /api/v1/courses/{id} → CourseDetail, CRS-101~104) ----

export type CourseDifficulty = 'EASY' | 'MODERATE' | 'HARD';
export type Level = 'LOW' | 'MEDIUM' | 'HIGH';
// 6.3장 VerificationStatus 중 기록에 붙는 값
export type RecordVerification = 'pending' | 'verified' | 'unverified' | 'rejected';

// CRS-102 러닝 환경. 모르는 항목은 null.
export type CourseEnvironment = {
  signals: Level | null;
  nightLight: Level | null;
  crowd: Level | null;
  surface: string | null;
  toilets: number | null;
  waterFountains: number | null;
};

export type CourseRankingEntry = {
  rank: number;
  name: string;
  timeSec: number;
  paceSecPerKm: number;
  relation: 'normal' | 'self' | 'friend';
  isPB?: boolean;
};

export type CourseDetail = {
  id: string;
  name: string;
  description: string | null;
  // 예: "대구 수성구"
  region: string;
  creatorName: string;
  distanceM: number;
  estimatedSec: number;
  difficulty: CourseDifficulty | null;
  elevationGainM: number | null;
  tags: string[];
  // 지도 표시용 경로 (77장: 단순화된 경로)
  route: GeoPoint[];
  // 출발점부터 거리(m)별 고도(m). 고도 정보가 없으면 null.
  elevationProfile: { distanceM: number; altitudeM: number }[] | null;
  finisherCount: number;
  weeklyRunnerCount: number;
  // 추천 시간대. 예: "새벽·저녁"
  recommendedTime: string | null;
  environment: CourseEnvironment;
  // CRS-103 내 코스 기록. 달린 적 없으면 null.
  myRecord: {
    bestSec: number;
    bestVerification: RecordVerification;
    lastSec: number;
    finishCount: number;
  } | null;
  // CRS-104 경쟁 정보. 랭킹·검증 정보를 받지 못하면 null (74장 verification info unavailable).
  competition: {
    leaderSec: number | null;
    myWeeklyRank: number | null;
    friendBest: { name: string; timeSec: number } | null;
    weeklyTop: CourseRankingEntry[];
    myEntry: CourseRankingEntry | null;
  } | null;
  bookmarked: boolean;
};
