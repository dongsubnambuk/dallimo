import { API_BASE_URL } from '@/shared/api/config';

import type { CourseRegistrationRepository } from './courseRegistration';
import type { CourseRepository } from './courseRepository';
import { createHttpCourseRegistration } from './httpCourseRegistration';
import { createHttpCourseRepository } from './httpCourseRepository';
import { createMockCourseRegistration, type RegisterScenario } from './mockCourseRegistration';
import { createMockCourseRepository, type MockCourseScenario } from './mockCourseRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock.
// 개발용 상태(loading · error · empty …)를 고르면 서버 주소가 있어도 mock으로 그 상태를 보여준다.
export function getCourseRepository(scenario: MockCourseScenario = 'normal'): CourseRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpCourseRepository() : createMockCourseRepository(scenario);
}

export function getCourseRegistration(scenario: RegisterScenario = 'normal'): CourseRegistrationRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpCourseRegistration() : createMockCourseRegistration(scenario);
}
