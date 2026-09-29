import { API_BASE_URL } from '@/shared/api/config';

import { createHttpUserRepository } from './httpUserRepository';
import { createMockUserRepository } from './mockUserRepository';
import type { UserRepository } from './userRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock (개발용 히스토리 상황은 mock에서만)
export function getUserRepository(mockScenario?: Parameters<typeof createMockUserRepository>[0]): UserRepository {
  return API_BASE_URL ? createHttpUserRepository() : createMockUserRepository(mockScenario);
}
