import { API_BASE_URL } from '@/shared/api/config';

import type { ChallengeRepository } from './challengeRepository';
import { createHttpChallengeRepository } from './httpChallengeRepository';
import { createMockChallengeRepository } from './mockChallengeRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock
export function getChallengeRepository(): ChallengeRepository {
  return API_BASE_URL ? createHttpChallengeRepository() : createMockChallengeRepository();
}
