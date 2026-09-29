import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getNotificationRepository } from '@/entities/notification/api';

export function useNotificationRepository() {
  return useMemo(() => getNotificationRepository(), []);
}

export function useNotificationList() {
  const repo = useNotificationRepository();
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: ({ pageParam }) => repo.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
}

export function useUnreadCount() {
  const repo = useNotificationRepository();
  return useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => repo.unreadCount(), retry: false });
}

/** 읽음 · 모두 읽음. 끝나면 목록 · 안 읽은 수를 다시 읽는다 */
export function useMarkRead() {
  const repo = useNotificationRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | 'all') => (id === 'all' ? repo.readAll() : repo.read(id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
