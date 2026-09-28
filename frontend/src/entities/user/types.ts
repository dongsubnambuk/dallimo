// SCR-M01 My (MY-001~002). GET /api/v1/users/me(UserProfileResponse)의 앱 쪽 모델.
// 누적 통계가 어느 응답에 들어올지는 OpenAPI 확정 시 맞춘다.
export type MyProfile = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  // AUTH-002 가입 때 서버가 만든다 (tbl_user.friend_code)
  friendCode: string;
  // 로그인한 방식 (tbl_user.provider)
  provider: 'APPLE' | 'GOOGLE' | 'KAKAO';
};

// PATCH /api/v1/users/me (nickname?, profileImage?). 이미지는 기기에서 고른 파일 주소를 넘긴다.
export type ProfileUpdate = { nickname?: string; profileImageUri?: string | null };

// 닉네임 확인 결과. 길이 규칙은 명세에 없어 DB 컬럼(nickname VARCHAR(40))만 따른다.
export type NicknameCheck = 'ok' | 'empty' | 'tooLong' | 'taken';

// 누적 거리 · 시간 · 횟수. 서버가 저장된 Run으로 집계한다.
export type MyStats = {
  totalDistanceM: number;
  totalActiveSec: number;
  runCount: number;
};

export type Me = { profile: MyProfile; stats: MyStats };
