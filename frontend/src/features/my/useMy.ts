import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { runResultRepository } from '@/entities/run/api';
import { createMockRunResultRepository, type HistoryScenario } from '@/entities/run/api/mockRunResultRepository';
import { getUserRepository } from '@/entities/user/api';

// 히스토리는 cursor로 20개씩 이어 받는다 (1321행 GET /runs?cursor=&size=20)
const PAGE_SIZE = 20;

function useRunRepository(scenario: HistoryScenario) {
  return useMemo(() => (scenario === 'normal' ? runResultRepository : createMockRunResultRepository(scenario)), [scenario]);
}

export function useMe(scenario: HistoryScenario) {
  const repo = useMemo(() => getUserRepository(scenario), [scenario]);
  return useQuery({ queryKey: ['me', scenario], queryFn: () => repo.getMe(), retry: false });
}

export function useRecentRuns(scenario: HistoryScenario, size: number) {
  const repo = useRunRepository(scenario);
  return useQuery({ queryKey: ['run', 'recent', scenario, size], queryFn: () => repo.list(null, size), retry: false });
}

export function useRunHistory(scenario: HistoryScenario) {
  const repo = useRunRepository(scenario);
  const list = useInfiniteQuery({
    queryKey: ['run', 'history', scenario],
    queryFn: ({ pageParam }) => repo.list(pageParam, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  return { list, items };
}
