import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CourseRepositoryError } from '@/entities/course/api/courseRepository';
import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import type { CourseDetail } from '@/entities/course/types';

import type { CourseScenario } from './scenario';

export type CourseDetailState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'error'; retry: () => void }
  | { kind: 'ready'; course: CourseDetail; refetch: () => void };

// CRS-101~104 코스 상세 조회. 서버 상태는 TanStack Query로 관리한다 (9.1장).
export function useCourseDetail(id: string, scenario: CourseScenario): CourseDetailState {
  const repo = useMemo(() => createMockCourseRepository(scenario), [scenario]);
  const query = useQuery({
    queryKey: ['course', 'detail', id, scenario],
    queryFn: () => repo.getDetail(id),
    retry: false,
  });

  if (query.isPending) return { kind: 'loading' };
  if (query.isError) {
    const e = query.error;
    // 비공개·숨김·삭제 코스는 다시 시도해도 볼 수 없으므로 오류와 구분한다
    if (e instanceof CourseRepositoryError && (e.kind === 'hidden' || e.kind === 'notFound')) return { kind: 'hidden' };
    return { kind: 'error', retry: () => query.refetch() };
  }
  return { kind: 'ready', course: query.data, refetch: () => query.refetch() };
}
