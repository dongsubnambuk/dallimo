// 서버 값 → 화면 문구. 앱(frontend)과 같은 말을 쓴다

export const USER_STATUS: Record<string, string> = { ACTIVE: '이용 중', SUSPENDED: '정지', WITHDRAWN: '탈퇴' };

export const COURSE_STATUS: Record<string, string> = {
  NEW: '새 코스',
  VERIFIED: '검증됨',
  POPULAR: '인기',
  HIDDEN: '숨김',
  BLOCKED: '차단',
};

export const COURSE_SOURCE: Record<string, string> = { USER: '회원 등록', OSM: 'OSM', DURUNUBI: '두루누비', GPX: 'GPX' };

export const REPORT_REASON: Record<string, string> = {
  DANGER: '위험',
  PRIVATE_PROPERTY: '사유지',
  WRONG_INFO: '잘못된 정보',
  OTHER: '그 밖',
};

export const MODERATION_ACTION: Record<string, string> = {
  AUTO_HIDE: '자동 숨김',
  HIDE: '숨김',
  BLOCK: '차단',
  RESTORE: '다시 공개',
};

export const AUDIT_ACTION: Record<string, string> = {
  USER_SUSPEND: '정지',
  USER_UNSUSPEND: '정지 해제',
  COURSE_HIDE: '코스 숨김',
  COURSE_BLOCK: '코스 차단',
  COURSE_RESTORE: '코스 다시 공개',
};

export const RUN_MODE: Record<string, string> = {
  FREE: '자유',
  COURSE: '코스',
  PB: 'PB 어택',
  CHALLENGE: '도전',
  LIVE_RACE: '레이스',
  TIME_ATTACK: '타임 어택',
  TOGETHER: '함께',
  INTERVAL: '인터벌',
};

export const RUN_STATUS: Record<string, string> = {
  RUNNING: '달리는 중',
  PAUSED: '일시정지',
  FINISHING: '마무리 중',
  FINISHED: '완료',
  CANCELED: '취소',
};

export const VERIFICATION: Record<string, string> = {
  NONE: '-',
  PENDING: '검증 중',
  VERIFIED: '인증',
  UNVERIFIED: '미인증',
  REJECTED: '거부',
};

// 서버 완주 검증 실패 사유 (frontend/src/entities/run/verificationReason.ts와 같은 말)
export const FAILURE_REASON: Record<string, string> = {
  START_NOT_NEAR: '출발점 근처에서 시작하지 않음',
  END_NOT_REACHED: '도착점까지 달리지 않음',
  DISTANCE_SHORT: '거리가 코스보다 많이 짧음',
  ROUTE_MISMATCH: '코스 경로를 벗어난 구간이 많음',
  SPEED_ANOMALY: '비정상적으로 빠른 구간',
  GPS_INSUFFICIENT: 'GPS 기록 부족',
  COURSE_UNAVAILABLE: '코스 정보 없음',
  GPS_SPARSE: '가져온 기록 경로가 성김',
};

export const RUN_SOURCE: Record<string, string> = {
  DALLIMO: '달리모',
  APPLE_HEALTH: 'Apple 건강',
  HEALTH_CONNECT: 'Health Connect',
  GARMIN: 'Garmin',
  COROS: 'COROS',
  GPX_IMPORT: 'GPX',
};

// 러너 정보 (frontend/src/features/onboarding/runnerOptions.ts와 같은 말)
export const RUNNER_DISTANCE: Record<string, string> = { UNDER_3K: '3km 이하', K3_TO_5: '3~5km', K5_TO_10: '5~10km', OVER_10K: '10km 이상' };
export const RUNNER_EXPERIENCE: Record<string, string> = { BEGINNER: '이제 시작', OCCASIONAL: '가끔', REGULAR: '꾸준히' };
export const RUNNER_TIME: Record<string, string> = { MORNING: '아침', DAYTIME: '낮', EVENING: '저녁', NIGHT: '밤' };

export const label = (map: Record<string, string>, v: string | null | undefined) => (v ? (map[v] ?? v) : '-');
