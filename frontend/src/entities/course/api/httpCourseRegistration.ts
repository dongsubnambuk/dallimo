import { runResultRepository } from '@/entities/run/api';
import { apiRequest, ApiRequestError } from '@/shared/api/http';

import { CourseRepositoryError } from './courseRepository';
import type { CourseRegistrationRepository } from './courseRegistration';
import { toCourseDetail, toCourseError, type CourseDetailDto } from './httpCourseRepository';

// CREG-004 POST /api/v1/courses. 서버가 내 FINISHED Run의 경로를 코스용으로 정규화해 만든다 (43.1장).
// 추천 시간 · 지역은 명세 요청 필드에 없어 서버와 정했다 (MOCK-CONTRACT-CHECK 8번).
const REJECTED: Record<string, string> = {
  RUN_POINT_INVALID: '경로 기록이 부족해서 코스로 만들 수 없어요',
  RUN_INVALID_STATE: '끝난 러닝만 코스로 만들 수 있어요',
  RUN_NOT_FOUND: '내 러닝 기록으로만 코스를 만들 수 있어요',
  RESOURCE_FORBIDDEN: '내 러닝 기록으로만 코스를 만들 수 있어요',
  VALIDATION_ERROR: '코스 정보를 확인해 주세요',
};

export function createHttpCourseRegistration(): CourseRegistrationRepository {
  return {
    async create(input) {
      const runId = await runResultRepository.serverRunId(input.sourceRunId);
      if (!runId) throw new CourseRepositoryError('invalid', '기록을 서버에 올린 뒤에 코스로 등록할 수 있어요');
      try {
        const dto = await apiRequest<CourseDetailDto>('/api/v1/courses', {
          method: 'POST',
          body: {
            sourceRunId: Number(runId),
            name: input.name.trim(),
            description: input.description?.trim() || null,
            tags: input.tags,
            region: input.region,
            recommendedTime: input.recommendedTime,
          },
        });
        return toCourseDetail(dto);
      } catch (e) {
        if (e instanceof ApiRequestError && REJECTED[e.code]) throw new CourseRepositoryError('invalid', REJECTED[e.code]);
        throw toCourseError(e);
      }
    },
  };
}
