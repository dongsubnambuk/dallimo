import { API_BASE_URL } from '@/shared/api/config';

import { createHttpShareRepository } from './httpShareRepository';
import { createMockShareRepository, shareRepository as mockShareRepository, type ShareScenario } from './mockShareRepository';
import type { ShareRepository } from './shareRepository';

// 서버 주소가 있고 개발용 상태가 normal이면 실제 서버, 아니면 mock (다른 저장소와 같은 규칙)
const httpShareRepository = API_BASE_URL ? createHttpShareRepository() : null;

export function getShareRepository(scenario: ShareScenario = 'normal'): ShareRepository {
  if (httpShareRepository && scenario === 'normal') return httpShareRepository;
  return scenario === 'normal' ? mockShareRepository : createMockShareRepository(scenario);
}
