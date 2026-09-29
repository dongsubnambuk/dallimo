import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getChallengeRepository } from '@/entities/challenge/api';

// 보낸 · 받은 도전. userId가 있으면 그 친구와 주고받은 것만.
// 만들고 아직 달리지 않은 도전(open)은 보여주지 않는다 (출발 전에 그만둔 도전이 남지 않게)
export function useChallenges(userId?: string) {
  const repo = useMemo(() => getChallengeRepository(), []);
  return useQuery({
    queryKey: ['challenges', userId ?? 'all'],
    queryFn: async () => (await repo.list(userId)).filter((c) => c.status !== 'open'),
    retry: false,
  });
}
