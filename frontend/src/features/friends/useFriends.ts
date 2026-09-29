import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getFriendRepository } from '@/entities/friend/api';
import { askNotifications } from '@/features/notifications/push';
import type { FriendScenario } from '@/entities/friend/api/mockFriendRepository';

// 친구 화면 · 프로필 · 마이 입구가 같은 캐시를 쓴다. 요청 · 승인 · 삭제 뒤에는 친구 관련 값을 모두 다시 읽는다
// (함께 달리기 친구 고르기 · 코스 친구 랭킹도 친구 목록에 따라 바뀐다)
export function useFriendRepository(scenario: FriendScenario) {
  return useMemo(() => getFriendRepository(scenario), [scenario]);
}

export function useFriendList(scenario: FriendScenario) {
  const repo = useFriendRepository(scenario);
  return useQuery({ queryKey: ['friends', 'list', scenario], queryFn: () => repo.list(), retry: false });
}

export function useFriendRequests(scenario: FriendScenario) {
  const repo = useFriendRepository(scenario);
  return useQuery({ queryKey: ['friends', 'requests', scenario], queryFn: () => repo.requests(), retry: false });
}

export function useUserSearch(scenario: FriendScenario, query: string) {
  const repo = useFriendRepository(scenario);
  const q = query.trim();
  return useQuery({
    queryKey: ['friends', 'search', scenario, q],
    queryFn: () => repo.search(q, null),
    enabled: q.length > 0,
    retry: false,
    staleTime: 10_000,
  });
}

export function useFriendProfile(scenario: FriendScenario, userId: string) {
  const repo = useFriendRepository(scenario);
  return useQuery({ queryKey: ['friends', 'profile', scenario, userId], queryFn: () => repo.profile(userId), retry: false });
}

export type FriendAction =
  | { kind: 'request'; userId: string }
  | { kind: 'accept'; requestId: string }
  | { kind: 'reject'; requestId: string }
  | { kind: 'remove'; userId: string };

/** 요청 · 승인 · 거절 · 삭제. 끝나면 친구 · 함께 달리기 친구 · 랭킹을 다시 읽는다 */
export function useFriendAction(scenario: FriendScenario) {
  const repo = useFriendRepository(scenario);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (a: FriendAction) => {
      // 친구 요청을 보낼 때 알림 권한을 묻는다 (수락되면 알 수 있게)
      if (a.kind === 'request') {
        void askNotifications();
        await repo.request(a.userId);
      }
      else if (a.kind === 'accept') await repo.accept(a.requestId);
      else if (a.kind === 'reject') await repo.reject(a.requestId);
      else await repo.remove(a.userId);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['friends'] });
      client.invalidateQueries({ queryKey: ['live', 'friends'] });
      client.invalidateQueries({ queryKey: ['ranking'] });
    },
  });
}
