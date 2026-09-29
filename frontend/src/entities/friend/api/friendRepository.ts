import type { FriendItem, FriendProfile, FriendRequests, UserSummary } from '../types';

export class FriendError extends Error {
  // notFound: 없는 사용자 · 이미 처리된 요청. network: 서버에 닿지 못함
  readonly kind: 'notFound' | 'invalid' | 'network';

  constructor(kind: FriendError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface FriendRepository {
  // FND-001: 닉네임 일부 또는 친구 코드
  search(query: string, cursor: string | null): Promise<{ items: UserSummary[]; nextCursor: string | null }>;
  // FND-002: 요청 뒤 관계 (상대가 먼저 요청했으면 바로 friend)
  request(userId: string): Promise<UserSummary>;
  // FND-003
  requests(): Promise<FriendRequests>;
  accept(requestId: string): Promise<UserSummary>;
  reject(requestId: string): Promise<void>;
  // FND-004: 친구 끊기 · 보낸 요청 취소
  remove(userId: string): Promise<void>;
  // FND-005
  list(): Promise<FriendItem[]>;
  profile(userId: string): Promise<FriendProfile>;
}
