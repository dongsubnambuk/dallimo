import { useQuery } from '@tanstack/react-query';

import { runResultRepository } from '@/entities/run/api';
import type { RunResult } from '@/entities/run/result';

export type RunResultState = { kind: 'loading' } | { kind: 'notFound' } | { kind: 'ready'; result: RunResult };

// 올리는 중이거나 검증 중이면 상태가 바뀔 때까지 다시 읽는다 (CRUN-005 PENDING → VERIFIED/UNVERIFIED)
const POLL_MS = 1000;

export function useRunResult(id: string): RunResultState {
  const query = useQuery({
    queryKey: ['run', 'result', id],
    queryFn: () => runResultRepository.get(id),
    retry: false,
    refetchInterval: (q) => {
      const r = q.state.data;
      return r && (r.sync === 'syncing' || (r.sync === 'synced' && r.verification === 'pending')) ? POLL_MS : false;
    },
  });
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: 'notFound' };
  return { kind: 'ready', result: query.data };
}
