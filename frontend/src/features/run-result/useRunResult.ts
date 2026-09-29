import { useQuery } from '@tanstack/react-query';

import { runResultRepository } from '@/entities/run/api';
import type { RunResult } from '@/entities/run/result';

export type RunResultState = { kind: 'loading' } | { kind: 'notFound' } | { kind: 'ready'; result: RunResult };

// 올리는 중이거나 검증 중이면 상태가 바뀔 때까지 다시 읽는다 (CRUN-005 PENDING → VERIFIED/UNVERIFIED)
const POLL_MS = 1000;
// 휴대폰에만 있는 기록은 연결되면 뒤에서 올라가므로 가끔 다시 읽는다 (RUN-007)
const LOCAL_ONLY_POLL_MS = 5000;

export function useRunResult(id: string): RunResultState {
  const query = useQuery({
    queryKey: ['run', 'result', id],
    queryFn: () => runResultRepository.get(id),
    retry: false,
    // 방금 끝낸 기록은 기기에 있다. 오프라인이어도 바로 읽는다 (RUN-006 Local First, 기본값 online은 오프라인이면 멈춘다)
    networkMode: 'offlineFirst',
    refetchInterval: (q) => {
      const r = q.state.data;
      if (r?.sync === 'localOnly') return LOCAL_ONLY_POLL_MS;
      return r && (r.sync === 'syncing' || (r.sync === 'synced' && r.verification === 'pending')) ? POLL_MS : false;
    },
  });
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: 'notFound' };
  return { kind: 'ready', result: query.data };
}
