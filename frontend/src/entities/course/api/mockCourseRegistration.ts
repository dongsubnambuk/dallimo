import { currentMockAccount } from '@/entities/auth/api/mockAccounts';
import { runResultRepository } from '@/entities/run/api';

import { CourseRepositoryError } from './courseRepository';
import { COURSE_NAME_MAX, type CourseRegistrationRepository } from './courseRegistration';
import { addMockCourse, createMockCourseRepository } from './mockCourseRepository';

// 개발용 등록 상황: 서버가 거부(경로 부족), 네트워크 오류
export const REGISTER_SCENARIOS = ['normal', 'rejected', 'error'] as const;
export type RegisterScenario = (typeof REGISTER_SCENARIOS)[number];

export function parseRegisterScenario(value: unknown): RegisterScenario {
  if (!__DEV__) return 'normal';
  return (REGISTER_SCENARIOS as readonly unknown[]).includes(value) ? (value as RegisterScenario) : 'normal';
}

// mock에서 "RunPoint가 코스 생성에 충분하지 않음"(43.1장)을 판단하는 값. 실제 기준은 서버 정책이다.
const MOCK_MIN_DISTANCE_M = 500;
const MOCK_MIN_POINTS = 10;
let nextId = 1;

export function createMockCourseRegistration(scenario: RegisterScenario = 'normal'): CourseRegistrationRepository {
  const courses = createMockCourseRepository('normal');
  return {
    async create(input) {
      await new Promise((r) => setTimeout(r, 800));
      if (scenario === 'error') throw new CourseRepositoryError('network', '서버에 연결하지 못했어요');
      const name = input.name.trim();
      if (!name || name.length > COURSE_NAME_MAX) throw new CourseRepositoryError('invalid', '코스 이름을 확인해 주세요');
      const run = await runResultRepository.get(input.sourceRunId).catch(() => null);
      if (!run) throw new CourseRepositoryError('invalid', '내 러닝 기록으로만 코스를 만들 수 있어요');
      if (run.sync !== 'synced') throw new CourseRepositoryError('invalid', '기록을 서버에 올린 뒤에 코스로 등록할 수 있어요');
      if (scenario === 'rejected' || run.distanceM < MOCK_MIN_DISTANCE_M || run.path.length < MOCK_MIN_POINTS) {
        throw new CourseRepositoryError('invalid', '경로 기록이 부족해서 코스로 만들 수 없어요');
      }
      const id = `c-new-${nextId++}`;
      const distanceM = Math.round(run.distanceM / 100) * 100;
      addMockCourse(
        {
          id,
          name,
          distanceM,
          tags: input.tags,
          displayRoute: run.path,
          myBestSec: null,
          leaderSec: null,
          // 6'00"/km 기준 예상 시간 (기존 mock 코스와 같은 기준)
          estimatedSec: Math.round((distanceM / 1000) * 360),
          finisherCount: 0,
          weeklyRunnerCount: 0,
          region: input.region,
          ratingAvg: null,
          reviewCount: 0,
        },
        {
          description: input.description?.trim() || null,
          creatorName: currentMockAccount()?.nickname ?? '수성러너',
          recommendedTime: input.recommendedTime,
          region: input.region,
        },
      );
      return courses.getDetail(id);
    },
  };
}
