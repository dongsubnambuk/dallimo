import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import type { FriendItem, FriendProfile, FriendRelation, UserSummary } from '../types';
import { FriendError, type FriendRepository } from './friendRepository';

// 44장 Friend API + GET /users/search · /users/{id} (backend FriendController · UserLookupController)

type SummaryDto = { userId: number; nickname: string; profileImageUrl: string | null; relation: 'NONE' | 'FRIEND' | 'SENT' | 'RECEIVED'; requestId: number | null };
type RequestDto = { requestId: number; userId: number; nickname: string; profileImageUrl: string | null; requestedAt: string };
type FriendDto = { userId: number; nickname: string; profileImageUrl: string | null; since: string };
type ProfileDto = { user: SummaryDto; lastRunAt: string | null; records: { recordId: number; courseId: number; courseName: string; bestSec: number; recordedAt: string }[] };

const toSummary = (u: SummaryDto): UserSummary => ({
  userId: String(u.userId),
  nickname: u.nickname,
  profileImageUrl: u.profileImageUrl,
  relation: u.relation.toLowerCase() as FriendRelation,
  requestId: u.requestId != null ? String(u.requestId) : null,
});

const toRequest = (r: RequestDto) => ({
  requestId: String(r.requestId),
  userId: String(r.userId),
  nickname: r.nickname,
  profileImageUrl: r.profileImageUrl,
  requestedAt: Date.parse(r.requestedAt),
});

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiRequestError && e.code !== 'NETWORK') {
      if (e.status === 404 || e.status === 409) throw new FriendError('notFound', e.message);
      if (e.status === 400) throw new FriendError('invalid', e.message);
    }
    throw new FriendError('network', e instanceof Error ? e.message : '서버에 연결하지 못했어요');
  }
}

// 숫자가 아닌 id(mock 사용자)는 서버에 없는 사용자다
const id = (v: string) => encodeURIComponent(v);

export function createHttpFriendRepository(): FriendRepository {
  return {
    search: (query, cursor) =>
      call(async () => {
        const page = await apiRequest<CursorPage<SummaryDto>>('/api/v1/users/search', { query: { q: query, size: '20', ...(cursor ? { cursor } : {}) } });
        return { items: page.items.map(toSummary), nextCursor: page.nextCursor };
      }),
    request: (userId) => call(async () => toSummary(await apiRequest<SummaryDto>('/api/v1/friends/requests', { method: 'POST', body: { userId: Number(userId) } }))),
    requests: () =>
      call(async () => {
        const r = await apiRequest<{ received: RequestDto[]; sent: RequestDto[] }>('/api/v1/friends/requests');
        return { received: r.received.map(toRequest), sent: r.sent.map(toRequest) };
      }),
    accept: (requestId) => call(async () => toSummary(await apiRequest<SummaryDto>(`/api/v1/friends/requests/${id(requestId)}/accept`, { method: 'POST' }))),
    reject: (requestId) => call(() => apiRequest<void>(`/api/v1/friends/requests/${id(requestId)}/reject`, { method: 'POST' })),
    remove: (userId) => call(() => apiRequest<void>(`/api/v1/friends/${id(userId)}`, { method: 'DELETE' })),
    list: () =>
      call(async () =>
        (await apiRequest<FriendDto[]>('/api/v1/friends')).map(
          (f): FriendItem => ({ userId: String(f.userId), nickname: f.nickname, profileImageUrl: f.profileImageUrl, since: Date.parse(f.since) }),
        ),
      ),
    profile: (userId) =>
      call(async () => {
        const p = await apiRequest<ProfileDto>(`/api/v1/users/${id(userId)}`);
        return {
          user: toSummary(p.user),
          lastRunAt: p.lastRunAt ? Date.parse(p.lastRunAt) : null,
          records: p.records.map((r) => ({
            recordId: String(r.recordId),
            courseId: String(r.courseId),
            courseName: r.courseName,
            bestSec: r.bestSec,
            recordedAt: Date.parse(r.recordedAt),
          })),
        } satisfies FriendProfile;
      }),
  };
}
