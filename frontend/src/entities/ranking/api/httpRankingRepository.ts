import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import type { CourseTitles, MyStanding, RankingEntry, RankingPeriod, RankingScope, TitleHolder } from '../types';
import { RankingRepositoryError, type RankingRepository } from './rankingRepository';

// 43장 GET /api/v1/courses/{id}/rankings (RNK-001~004)와 /rankings/me (RNK-005).
// 서버 기간 경계: 주간 월요일 0시 · 월간 1일 0시(한국 시간). 친구 랭킹은 친구 기능(WBS 8) 전이라 서버가 빈 목록을 준다.

export type RankingEntryDto = {
  rank: number;
  userId: number;
  name: string;
  timeSec: number;
  paceSecPerKm: number;
  relation: 'self' | 'normal' | 'friend';
  isPB: boolean;
};

export function toRankingEntry(e: RankingEntryDto): RankingEntry {
  return { rank: e.rank, userId: String(e.userId), name: e.name, timeSec: e.timeSec, paceSecPerKm: e.paceSecPerKm, relation: e.relation, isPB: e.isPB };
}

type HolderDto = { userId: number; name: string; profileImageUrl: string | null; relation: TitleHolder['relation'] };
type CrownDto = { periodDays: number; holder: HolderDto | null; timeSec: number | null; paceSecPerKm: number | null; me: { bestSec: number; gapSec: number; holder: boolean } | null };
type LegendDto = { periodDays: number; minFinishes: number; holder: HolderDto | null; finishCount: number | null; me: { finishCount: number; needed: number; holder: boolean } | null };

const toHolder = (h: HolderDto | null): TitleHolder | null => (h ? { userId: String(h.userId), name: h.name, profileImageUrl: h.profileImageUrl, relation: h.relation } : null);

const PERIOD: Record<RankingPeriod, string> = { all: 'ALL', weekly: 'WEEKLY', monthly: 'MONTHLY' };
const SCOPE: Record<RankingScope, string> = { all: 'ALL', friends: 'FRIENDS' };

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new RankingRepositoryError(e instanceof ApiRequestError ? e.message : '랭킹을 불러오지 못했어요');
  }
}

export function createHttpRankingRepository(): RankingRepository {
  const path = (courseId: string) => `/api/v1/courses/${encodeURIComponent(courseId)}/rankings`;
  return {
    getPage: ({ courseId, scope, period, cursor, size }) =>
      call(async () => {
        const page = await apiRequest<CursorPage<RankingEntryDto>>(path(courseId), {
          query: { scope: SCOPE[scope], period: PERIOD[period], size: String(size), ...(cursor ? { cursor } : {}) },
        });
        return { entries: page.items.map(toRankingEntry), nextCursor: page.nextCursor };
      }),

    getMyStanding: (courseId, scope, period) =>
      call(async () => {
        const s = await apiRequest<{ total: number; entry: RankingEntryDto | null; around: RankingEntryDto[] }>(`${path(courseId)}/me`, {
          query: { scope: SCOPE[scope], period: PERIOD[period] },
        });
        const standing: MyStanding = { total: s.total, entry: s.entry ? toRankingEntry(s.entry) : null, around: s.around.map(toRankingEntry) };
        return standing;
      }),

    // 124장 GET /courses/{id}/crown · /local-legend
    getTitles: (courseId) =>
      call(async () => {
        const base = `/api/v1/courses/${encodeURIComponent(courseId)}`;
        const [c, l] = await Promise.all([apiRequest<CrownDto>(`${base}/crown`), apiRequest<LegendDto>(`${base}/local-legend`)]);
        const titles: CourseTitles = {
          crown: { periodDays: c.periodDays, holder: toHolder(c.holder), timeSec: c.timeSec, paceSecPerKm: c.paceSecPerKm, me: c.me },
          legend: { periodDays: l.periodDays, minFinishes: l.minFinishes, holder: toHolder(l.holder), finishCount: l.finishCount, me: l.me },
        };
        return titles;
      }),
  };
}
