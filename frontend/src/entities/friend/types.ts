// 친구 (FND-001~005, 44장). 서버 FriendService 값의 앱 쪽 모델.

// 보는 사람 기준 관계: 없음 · 친구 · 내가 요청함 · 나에게 요청함
export type FriendRelation = 'none' | 'friend' | 'sent' | 'received';

// 검색 결과 · 프로필 머리. requestId는 요청 중일 때만 (받은 요청 승인 · 거절에 쓴다)
export type UserSummary = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  relation: FriendRelation;
  requestId: string | null;
};

export type FriendItem = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  // 친구가 된 시각 (epoch ms)
  since: number;
};

export type FriendRequest = {
  requestId: string;
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  requestedAt: number;
};

export type FriendRequests = { received: FriendRequest[]; sent: FriendRequest[] };

// 친구 프로필. 기록 · 마지막 러닝은 친구에게만 온다 (사용자 결정: 자유 달리기 경로는 보여주지 않는다)
export type FriendProfile = {
  user: UserSummary;
  lastRunAt: number | null;
  // recordId: 그 코스 최고 공식 기록 (도전 목표, CHL-001)
  records: { recordId: string; courseId: string; courseName: string; bestSec: number; recordedAt: number }[];
};
