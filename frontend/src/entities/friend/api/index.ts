import { API_BASE_URL } from '@/shared/api/config';

import type { FriendRepository } from './friendRepository';
import { createHttpFriendRepository } from './httpFriendRepository';
import { createMockFriendRepository, type FriendScenario } from './mockFriendRepository';

// 서버 주소가 있고 개발용 상태가 normal이면 실제 서버, 아니면 mock (다른 저장소와 같은 규칙)
export function getFriendRepository(scenario: FriendScenario = 'normal'): FriendRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpFriendRepository() : createMockFriendRepository(scenario);
}
