import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createMockRankingRepository, type RankingScenario } from '@/entities/ranking/api/mockRankingRepository';
import type { RankingPeriod, RankingScope } from '@/entities/ranking/types';

// 한 번에 받는 순위 수. 긴 목록은 cursor로 이어 받는다 (43장 cursor,size)
const PAGE_SIZE = 20;

export function useCourseRanking(courseId: string, scope: RankingScope, period: RankingPeriod, scenario: RankingScenario) {
  const repo = useMemo(() => createMockRankingRepository(scenario), [scenario]);
  const list = useInfiniteQuery({
    queryKey: ['ranking', courseId, scope, period, scenario],
    queryFn: ({ pageParam }) => repo.getPage({ courseId, scope, period, cursor: pageParam, size: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const standing = useQuery({
    queryKey: ['ranking', 'me', courseId, scope, period, scenario],
    queryFn: () => repo.getMyStanding(courseId, scope, period),
    retry: false,
  });
  const entries = useMemo(() => list.data?.pages.flatMap((p) => p.entries) ?? [], [list.data]);
  return { list, standing, entries };
}
