// SCR-M01 My (MY-001~002). GET /api/v1/users/me(UserProfileResponse)의 앱 쪽 모델.
// 누적 통계가 어느 응답에 들어올지는 OpenAPI 확정 시 맞춘다.
export type MyProfile = {
  userId: string;
  nickname: string;
  // AUTH-002 가입 때 서버가 만든다 (tbl_user.friend_code)
  friendCode: string;
  // 가입한 이메일 (이메일 로그인, 명세 41장 변경)
  email: string;
};

// PATCH /api/v1/users/me (nickname). 프로필 사진은 뺐다 (결정 로그 60항)
export type ProfileUpdate = { nickname: string };

// 닉네임 확인 결과. 길이 규칙은 명세에 없어 DB 컬럼(nickname VARCHAR(40))만 따른다. 서버와 같은 기준(앞뒤 공백 제외).
export type NicknameCheck = 'ok' | 'empty' | 'tooLong' | 'taken';

// 누적 거리 · 시간 · 횟수. 서버가 저장된 Run으로 집계한다.
export type MyStats = {
  totalDistanceM: number;
  totalActiveSec: number;
  runCount: number;
};

// 온보딩 러너 정보 (사용자 결정, 결정 로그 64항). 고르지 않은 값은 null. 탐색 추천 코스에 쓴다
export type RunnerDistance = 'UNDER_3K' | 'K3_TO_5' | 'K5_TO_10' | 'OVER_10K';
export type RunnerExperience = 'BEGINNER' | 'OCCASIONAL' | 'REGULAR';
export type RunnerTime = 'MORNING' | 'DAYTIME' | 'EVENING' | 'NIGHT';
export type RunnerProfile = {
  distance: RunnerDistance | null;
  experience: RunnerExperience | null;
  preferredTime: RunnerTime | null;
};
export const EMPTY_RUNNER: RunnerProfile = { distance: null, experience: null, preferredTime: null };

export type Me = { profile: MyProfile; stats: MyStats; runner: RunnerProfile };
