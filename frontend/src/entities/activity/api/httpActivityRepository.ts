import type { CursorPage } from '@/shared/api/contract';
import { apiRequest } from '@/shared/api/http';

import type { Activity, ActivityType } from '../types';
import type { ActivityRepository } from './activityRepository';

// 친구 활동 API (backend ActivityController)
type Dto = {
  id: number;
  type: ActivityType;
  userId: number;
  nickname: string;
  isMine: boolean;
  createdAt: string;
  courseId: number;
  courseName: string;
  courseDistanceM: number;
  timeSec: number | null;
  previousSec: number | null;
  rank: number | null;
  targetNickname: string | null;
  targetSec: number | null;
  targetIsMe: boolean;
  finishCount?: number | null;
};

const toActivity = (a: Dto): Activity => ({
  id: String(a.id),
  type: a.type,
  userId: String(a.userId),
  nickname: a.nickname,
  isMine: a.isMine,
  createdAt: Date.parse(a.createdAt),
  course: { id: String(a.courseId), name: a.courseName, distanceM: a.courseDistanceM },
  timeSec: a.timeSec,
  previousSec: a.previousSec,
  rank: a.rank,
  finishCount: a.finishCount ?? null,
  target: a.targetNickname != null && a.targetSec != null ? { nickname: a.targetNickname, timeSec: a.targetSec, isMe: a.targetIsMe } : null,
});

export function createHttpActivityRepository(): ActivityRepository {
  return {
    list: async (cursor) => {
      const page = await apiRequest<CursorPage<Dto>>('/api/v1/activities', { query: { size: '20', ...(cursor ? { cursor } : {}) } });
      return { items: page.items.map(toActivity), nextCursor: page.nextCursor };
    },
  };
}
