import { API_BASE_URL } from '@/shared/api/config';

import { createHttpRankingRepository } from './httpRankingRepository';
import { createMockRankingRepository, type RankingScenario } from './mockRankingRepository';
import type { RankingRepository } from './rankingRepository';

// 서버 주소가 있고 개발용 상태가 normal이면 실제 서버, 아니면 mock (코스 저장소와 같은 규칙)
export function getRankingRepository(scenario: RankingScenario = 'normal'): RankingRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpRankingRepository() : createMockRankingRepository(scenario);
}
