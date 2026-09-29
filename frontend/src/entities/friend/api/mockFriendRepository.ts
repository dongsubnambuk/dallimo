import type { FriendItem, FriendProfile, FriendRelation, FriendRequest, UserSummary } from '../types';
import { FriendError, type FriendRepository } from './friendRepository';

// 개발 빌드 QA용 친구 상황 (SCREEN-SPECS: loading, empty, error)
export const FRIEND_SCENARIOS = ['normal', 'empty', 'error'] as const;
export type FriendScenario = (typeof FRIEND_SCENARIOS)[number];

export function parseFriendScenario(value: unknown): FriendScenario {
  if (!__DEV__) return 'normal';
  return (FRIEND_SCENARIOS as readonly unknown[]).includes(value) ? (value as FriendScenario) : 'normal';
}

type Person = { userId: string; nickname: string; friendCode: string };

// 함께 달리기 mock(mockLiveRoomRepository)과 같은 친구들
const PEOPLE: Person[] = [
  { userId: 'u-minsu', nickname: '민수', friendCode: 'RUN-M1NSU2' },
  { userId: 'u-haneul', nickname: '하늘', friendCode: 'RUN-HANEU7' },
  { userId: 'u-jisu', nickname: '지수', friendCode: 'RUN-J2SU3K' },
  { userId: 'u-doyun', nickname: '도윤', friendCode: 'RUN-D8YUNQ' },
  { userId: 'u-seoyeon', nickname: '서연', friendCode: 'RUN-SE9YWN' },
  { userId: 'u-junho', nickname: '준호', friendCode: 'RUN-JUNH4Z' },
  { userId: 'u-yuna', nickname: '유나', friendCode: 'RUN-YUNA5P' },
  { userId: 'u-beomeo', nickname: '범어러너', friendCode: 'RUN-BEM3RX' },
  { userId: 'u-suseong', nickname: '수성달림이', friendCode: 'RUN-SSD6LM' },
  { userId: 'u-sincheon', nickname: '신천새벽런', friendCode: 'RUN-SC7NWD' },
];

const DAY = 86_400_000;

// 관계 한 줄 (requester가 요청한 사람)
type Link = { id: string; userId: string; status: 'pending' | 'friend'; requester: 'me' | 'them'; at: number };

let state: Link[] | null = null;
let nextId = 100;

function initial(): Link[] {
  const now = Date.now();
  return [
    { id: 'fr-1', userId: 'u-minsu', status: 'friend', requester: 'me', at: now - 40 * DAY },
    { id: 'fr-2', userId: 'u-haneul', status: 'friend', requester: 'them', at: now - 20 * DAY },
    { id: 'fr-3', userId: 'u-jisu', status: 'friend', requester: 'me', at: now - 12 * DAY },
    { id: 'fr-4', userId: 'u-doyun', status: 'friend', requester: 'them', at: now - 5 * DAY },
    { id: 'fr-5', userId: 'u-seoyeon', status: 'friend', requester: 'me', at: now - 2 * DAY },
    { id: 'fr-6', userId: 'u-junho', status: 'pending', requester: 'them', at: now - 3 * 3_600_000 },
    { id: 'fr-7', userId: 'u-yuna', status: 'pending', requester: 'me', at: now - DAY },
  ];
}

const RECORDS: Record<string, FriendProfile['records']> = {
  'u-minsu': [
    { courseId: 'c-suseongmot', courseName: '수성못 둘레길', bestSec: 1491, recordedAt: Date.now() - 2 * DAY },
    { courseId: 'c-deuran', courseName: '들안로 왕복', bestSec: 1122, recordedAt: Date.now() - 9 * DAY },
  ],
  'u-haneul': [{ courseId: 'c-suseongmot', courseName: '수성못 둘레길', bestSec: 1560, recordedAt: Date.now() - 4 * DAY }],
  'u-jisu': [{ courseId: 'c-beomeo', courseName: '범어공원 언덕 루프', bestSec: 1305, recordedAt: Date.now() - 6 * DAY }],
};

const wait = () => new Promise((r) => setTimeout(r, 350));

// 앱 실행 동안 요청 · 승인 · 삭제가 이어지도록 모듈에 둔다
export function createMockFriendRepository(scenario: FriendScenario = 'normal'): FriendRepository {
  const links = () => {
    if (scenario === 'empty') return [];
    state ??= initial();
    return state;
  };
  const guard = async () => {
    await wait();
    if (scenario === 'error') throw new FriendError('network', '서버에 연결하지 못했어요');
  };
  const person = (userId: string) => {
    const p = PEOPLE.find((x) => x.userId === userId);
    if (!p) throw new FriendError('notFound', '사용자를 찾을 수 없어요');
    return p;
  };
  const summary = (p: Person): UserSummary => {
    const l = links().find((x) => x.userId === p.userId);
    const relation: FriendRelation = !l ? 'none' : l.status === 'friend' ? 'friend' : l.requester === 'me' ? 'sent' : 'received';
    return { userId: p.userId, nickname: p.nickname, profileImageUrl: null, relation, requestId: l?.status === 'pending' ? l.id : null };
  };
  const toRequest = (l: Link): FriendRequest => ({ requestId: l.id, userId: l.userId, nickname: person(l.userId).nickname, profileImageUrl: null, requestedAt: l.at });

  return {
    async search(query) {
      await guard();
      const q = query.trim().toLowerCase();
      const code = q.toUpperCase().replace(/^RUN-/, '');
      const items = PEOPLE.filter((p) => p.nickname.toLowerCase().includes(q) || p.friendCode === `RUN-${code}`).map(summary);
      return { items, nextCursor: null };
    },
    async request(userId) {
      await guard();
      const p = person(userId);
      const all = links();
      const l = all.find((x) => x.userId === userId);
      if (!l) all.push({ id: `fr-${nextId++}`, userId, status: 'pending', requester: 'me', at: Date.now() });
      else if (l.status === 'pending' && l.requester === 'them') Object.assign(l, { status: 'friend', at: Date.now() });
      return summary(p);
    },
    async requests() {
      await guard();
      const pending = links().filter((l) => l.status === 'pending').sort((a, b) => b.at - a.at);
      return { received: pending.filter((l) => l.requester === 'them').map(toRequest), sent: pending.filter((l) => l.requester === 'me').map(toRequest) };
    },
    async accept(requestId) {
      await guard();
      const l = links().find((x) => x.id === requestId && x.requester === 'them');
      if (!l) throw new FriendError('notFound', '친구 요청을 찾을 수 없어요');
      Object.assign(l, { status: 'friend', at: Date.now() });
      return summary(person(l.userId));
    },
    async reject(requestId) {
      await guard();
      const all = links();
      const i = all.findIndex((x) => x.id === requestId && x.requester === 'them' && x.status === 'pending');
      if (i < 0) throw new FriendError('notFound', '친구 요청을 찾을 수 없어요');
      all.splice(i, 1);
    },
    async remove(userId) {
      await guard();
      const all = links();
      const i = all.findIndex((x) => x.userId === userId);
      if (i >= 0) all.splice(i, 1);
    },
    async list() {
      await guard();
      return links()
        .filter((l) => l.status === 'friend')
        .map((l): FriendItem => ({ userId: l.userId, nickname: person(l.userId).nickname, profileImageUrl: null, since: l.at }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));
    },
    async profile(userId) {
      await guard();
      const user = summary(person(userId));
      if (user.relation !== 'friend') return { user, lastRunAt: null, records: [] };
      const records = RECORDS[userId] ?? [];
      return { user, lastRunAt: records[0]?.recordedAt ?? Date.now() - 3 * DAY, records };
    },
  };
}
