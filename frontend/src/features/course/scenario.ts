import type { MockCourseScenario } from '@/entities/course/api/mockCourseRepository';

// 개발 빌드에서 코스 상세 상태를 강제로 만들어 QA하기 위한 값 (74장: loading, private/hidden, no record, has PB, verification info unavailable).
// production에서는 항상 'normal'이다. normal = has PB (기록이 있는 코스 기준).
export const COURSE_SCENARIOS = ['normal', 'loading', 'hidden', 'error', 'noRecord', 'rankingUnavailable'] as const;
export type CourseScenario = (typeof COURSE_SCENARIOS)[number] & MockCourseScenario;

export function parseCourseScenario(value: unknown): CourseScenario {
  if (!__DEV__) return 'normal';
  return (COURSE_SCENARIOS as readonly unknown[]).includes(value) ? (value as CourseScenario) : 'normal';
}
