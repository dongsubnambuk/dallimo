import { API_BASE_URL } from '@/shared/api/config';

import type { ActivityRepository } from './activityRepository';
import { createHttpActivityRepository } from './httpActivityRepository';
import { createMockActivityRepository, type ActivityScenario } from './mockActivityRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock. 개발용 상황을 고르면 mock
export function getActivityRepository(scenario: ActivityScenario = 'normal'): ActivityRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpActivityRepository() : createMockActivityRepository(scenario);
}
