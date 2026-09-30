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
  // 지역 이름. 예: "대구 수성구". 모르면 null
  region: string | null;
  // REV-001 완주자 평가 평균(1~5, 소수 한 자리)과 수. 평가가 없으면 null · 0 (CRS-004 평점 필터 · 정렬)
  ratingAvg: number | null;
  reviewCount: number;
};

export type NearbyCourseQuery = {
  center: GeoPoint;
  radiusM: number;
};

// ---- 코스 상세 (43장 GET /api/v1/courses/{id} → CourseDetail, CRS-101~104) ----

export type CourseDifficulty = 'EASY' | 'MODERATE' | 'HARD';
// 외부 공개 데이터로 만든 달리모 추천 코스의 출처 (결정 로그 52항). OSM · 두루누비 · 관리자가 올린 GPX
export type CourseSourceKind = 'OSM' | 'DURUNUBI' | 'GPX';
export type CourseSourceInfo = {
  kind: CourseSourceKind;
  // 상세에 그대로 보여 준다. 예: "© OpenStreetMap contributors" (OSM은 ODbL 출처 표시 의무)
  attribution: string | null;
  license: string | null;
  // 원본 페이지 (없으면 null)
  url: string | null;
};
// 6.3장 CourseStatus. HIDDEN · BLOCKED는 상세를 볼 수 없다(CourseRepositoryError 'hidden').
export type CourseStatus = 'NEW' | 'VERIFIED' | 'POPULAR';
export type Level = 'LOW' | 'MEDIUM' | 'HIGH';
// 6.3장 VerificationStatus 중 기록에 붙는 값
export type RecordVerification = 'pending' | 'verified' | 'unverified' | 'rejected';

// CRS-102 러닝 환경. 완주자 평가를 모은 값이고, 모르는 항목은 null.
export type CourseEnvironment = {
  signals: Level | null;
  nightLight: Level | null;
  crowd: Level | null;
  surface: string | null;
  // 화장실 · 급수대가 있는지
  toilets: boolean | null;
  waterFountains: boolean | null;
};

// ---- 코스 평가 (REV-001, 43장 POST /courses/{id}/reviews) ----

// 환경 점수는 1~3: 신호 적음 · 보통 · 많음, 야간 어두움 · 보통 · 밝음, 혼잡 한적함 · 보통 · 붐빔, 노면 울퉁불퉁 · 보통 · 고름
export type ReviewScore = 1 | 2 | 3;

export type CourseReview = {
  id: string;
  nickname: string;
  isMine: boolean;
  rating: number;
  surfaceScore: ReviewScore | null;
  signalScore: ReviewScore | null;
  nightScore: ReviewScore | null;
  crowdScore: ReviewScore | null;
  hasToilet: boolean | null;
  hasWater: boolean | null;
  content: string | null;
  // epoch ms
  createdAt: number;
};

export type ReviewInput = Omit<CourseReview, 'id' | 'nickname' | 'isMine' | 'createdAt'>;

export type CourseRating = {
  avg: number | null;
  count: number;
  // 이 코스를 인증 완주해서 평가할 수 있는지
  canReview: boolean;
  mine: CourseReview | null;
};

// ---- 코스 신고 (CREG-005) ----
export type ReportReason = 'DANGER' | 'PRIVATE_PROPERTY' | 'WRONG_INFO' | 'OTHER';

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
  status: CourseStatus;
  description: string | null;
  // 예: "대구 수성구". 등록할 때 휴대폰이 출발점으로 알아낸 값 (웹에서 등록한 코스는 null)
  region: string | null;
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
  // 추천 코스 출처. 사용자가 등록한 코스는 null
  source: CourseSourceInfo | null;
  // REV-001 평가 요약 · 내 평가
  rating: CourseRating;
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
    // recordId: 서버 공식 기록 id (도전 목표, mock에는 없다)
    friendBest: { name: string; timeSec: number; recordId?: string } | null;
    weeklyTop: CourseRankingEntry[];
    myEntry: CourseRankingEntry | null;
  } | null;
  bookmarked: boolean;
};

// ---- 코스 등록 (43장 POST /api/v1/courses, CREG-001~004) ----

// sourceRunId는 내 FINISHED Run이어야 한다 (43.1장). 추천 시간은 SCR-E05 주요 요소.
export type NewCourseInput = {
  sourceRunId: string;
  name: string;
  description: string | null;
  tags: string[];
  recommendedTime: string | null;
  // 출발점 지역 이름 (휴대폰 지오코딩, 모르면 null)
  region: string | null;
};

// ---- 내 코스 (SCR-M04, MY-005: 등록/저장/완주) ----
export type MyCourseKind = 'created' | 'saved' | 'finished';

export type MyCourse = CourseSummary & {
  // 등록한 코스: 등록 시각
  createdAt: number | null;
  // 완주한 코스: 완주 횟수
  finishCount: number | null;
  // 내가 만든 코스는 신고로 숨겨졌거나(HIDDEN, 검토 중) 공개가 중지된(BLOCKED) 상태도 온다 (결정 로그 53항)
  status: CourseStatus | 'HIDDEN' | 'BLOCKED';
};
