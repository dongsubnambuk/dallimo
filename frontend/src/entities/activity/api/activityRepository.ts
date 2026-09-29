import type { Activity } from '../types';

export interface ActivityRepository {
  // 친구와 나의 활동, 최근 먼저
  list(cursor: string | null): Promise<{ items: Activity[]; nextCursor: string | null }>;
}
