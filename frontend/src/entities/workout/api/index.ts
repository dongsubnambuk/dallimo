import { API_BASE_URL } from '@/shared/api/config';

import { createHttpWorkoutRepository } from './httpWorkoutRepository';
import { createMockWorkoutRepository, type WorkoutScenario } from './mockWorkoutRepository';
import type { WorkoutRepository } from './workoutRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock. 개발용 상황을 고르면 mock
export function getWorkoutRepository(scenario: WorkoutScenario = 'normal'): WorkoutRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpWorkoutRepository() : createMockWorkoutRepository(scenario);
}
