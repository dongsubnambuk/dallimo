// SCR-M01 My (MY-001~002). GET /api/v1/users/me(UserProfileResponse)의 앱 쪽 모델.
// 누적 통계가 어느 응답에 들어올지는 OpenAPI 확정 시 맞춘다.
export type MyProfile = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
};

// 누적 거리 · 시간 · 횟수. 서버가 저장된 Run으로 집계한다.
export type MyStats = {
  totalDistanceM: number;
  totalActiveSec: number;
  runCount: number;
};

export type Me = { profile: MyProfile; stats: MyStats };
