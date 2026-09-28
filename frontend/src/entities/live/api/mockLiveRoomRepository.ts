import type { CreateRoomInput, Friend, LiveMember, LiveResult, LiveRoom, LiveRoomSummary } from '../types';
import { LiveRoomError, type LiveRoomRepository } from './liveRoomRepository';

// 개발 빌드에서 Together 상태를 만들어 QA하기 위한 값 (SCREEN-SPECS Together: invite, waiting, ready, disconnected, reconnecting …).
export const LIVE_SCENARIOS = ['normal', 'loading', 'empty', 'error', 'disconnected', 'canceled'] as const;
export type LiveScenario = (typeof LIVE_SCENARIOS)[number];

export function parseLiveScenario(value: unknown): LiveScenario {
  if (!__DEV__) return 'normal';
  return (LIVE_SCENARIOS as readonly unknown[]).includes(value) ? (value as LiveScenario) : 'normal';
}

const ME: Friend = { userId: 'me', name: '수성러너' };
const FRIENDS: Friend[] = [
  { userId: 'u-minsu', name: '민수' },
  { userId: 'u-haneul', name: '하늘' },
  { userId: 'u-jisu', name: '지수' },
  { userId: 'u-doyun', name: '도윤' },
  { userId: 'u-seoyeon', name: '서연' },
];
const COURSE_NAMES: Record<string, string> = {
  'c-suseongmot': '수성못 둘레길',
  'c-deuran': '들안로 왕복',
  'c-beomeo': '범어공원 언덕 루프',
  'c-sincheon': '신천 강변 왕복',
  'c-dusan': '두산오거리 블록',
};

// 모두 준비된 뒤 출발까지 (서버가 정하는 값의 mock)
const START_DELAY_MS = 5000;
const DELAY_MS = 400;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 초대한 친구가 들어오고 준비하는 흐름 흉내: [들어오는 시점, 준비하는 시점] (방 만든 뒤 ms). 세 번째부터는 응답하지 않는다.
const FRIEND_TIMELINE: [number, number][] = [
  [1500, 3500],
  [3000, 7000],
];

type Stored = {
  room: LiveRoom;
  createdAt: number;
  scenario: LiveScenario;
  simulate: boolean;
  // 사용자가 직접 바꾼 내 상태
  meReady: boolean;
  meJoined: boolean;
  left: boolean;
  allReadyAt: number | null;
};

const rooms = new Map<string, Stored>();
const results = new Map<string, LiveResult>();

/** mock 채널이 방 종료(ROOM_FINISHED) 때 최종 결과를 넣는다 */
export function storeLiveResult(result: LiveResult) {
  results.set(result.roomId, result);
  const s = rooms.get(result.roomId);
  if (s) s.room = { ...s.room, status: 'FINISHED' };
}
let nextId = 1;
let seeded = false;

function member(f: Friend, status: LiveMember['status'], host = false): LiveMember {
  return { userId: f.userId, name: f.name, status, isHost: host, isMe: f.userId === ME.userId };
}

function at(hoursFromNow: number, minutes = 0) {
  const d = new Date(Date.now() + hoursFromNow * 3_600_000);
  d.setMinutes(minutes, 0, 0);
  return d.getTime();
}

function seed() {
  if (seeded) return;
  seeded = true;
  const put = (room: LiveRoom, meJoined: boolean) =>
    rooms.set(room.id, { room, createdAt: Date.now(), scenario: 'normal', simulate: false, meReady: false, meJoined, left: false, allReadyAt: null });
  put(
    {
      id: 'r-evening',
      mode: 'LIVE_RACE',
      targetDistanceM: 5000,
      targetSeconds: null,
      course: null,
      scheduledAt: at(2),
      status: 'WAITING',
      startsAt: null,
      members: [member(ME, 'JOINED', true), member(FRIENDS[0], 'READY'), member(FRIENDS[1], 'JOINED'), member(FRIENDS[2], 'INVITED')],
    },
    true,
  );
  put(
    {
      id: 'r-morning',
      mode: 'TIME_ATTACK',
      targetDistanceM: null,
      targetSeconds: 1800,
      course: null,
      scheduledAt: at(24 - new Date().getHours() + 7),
      status: 'WAITING',
      startsAt: null,
      members: [member(FRIENDS[1], 'JOINED', true), member(ME, 'INVITED'), member(FRIENDS[3], 'JOINED')],
    },
    false,
  );
}

// 시간이 지남에 따라 친구 상태와 방 상태를 바꾼다. 실제로는 서버가 방 상태 전이를 결정한다 (45.1장).
function snapshot(s: Stored): LiveRoom {
  const now = Date.now();
  const age = now - s.createdAt;
  const room = s.room;
  if (s.scenario === 'canceled' && age > 4000) return { ...room, status: 'CANCELED', startsAt: null };
  if (room.status === 'FINISHED') return room;

  let friendIndex = 0;
  const members = room.members.map((m) => {
    if (m.isMe) return { ...m, status: s.meReady ? 'READY' : s.meJoined ? 'JOINED' : 'INVITED' } as LiveMember;
    if (!s.simulate) return m;
    const t = FRIEND_TIMELINE[friendIndex++];
    if (!t) return m;
    // disconnected: 두 번째 친구가 잠시 연결이 끊겼다 돌아온다
    if (s.scenario === 'disconnected' && friendIndex === 2 && age > 4500 && age < 12000) return { ...m, status: 'DISCONNECTED' } as LiveMember;
    return { ...m, status: age >= t[1] ? 'READY' : age >= t[0] ? 'JOINED' : 'INVITED' } as LiveMember;
  });

  const joined = members.filter((m) => m.status !== 'INVITED');
  const allReady = joined.length >= 2 && joined.every((m) => m.status === 'READY');
  const timeOk = room.scheduledAt == null || now >= room.scheduledAt;
  if (allReady && timeOk) s.allReadyAt ??= now;
  else s.allReadyAt = null;

  const startsAt = s.allReadyAt != null ? s.allReadyAt + START_DELAY_MS : null;
  const status = startsAt != null && now >= startsAt ? 'RUNNING' : allReady ? 'READY' : 'WAITING';
  return { ...room, members, status, startsAt };
}

export function createMockLiveRoomRepository(scenario: LiveScenario): LiveRoomRepository {
  seed();
  const find = (id: string) => {
    const s = rooms.get(id);
    if (!s || s.left) throw new LiveRoomError('notFound', '방을 찾을 수 없어요');
    return s;
  };
  const guard = async () => {
    if (scenario === 'loading') await new Promise(() => {});
    await wait(DELAY_MS);
    if (scenario === 'error') throw new LiveRoomError('network', '서버에 연결하지 못했어요');
  };

  return {
    async listUpcoming() {
      await guard();
      if (scenario === 'empty') return [];
      return [...rooms.values()]
        .filter((s) => !s.left)
        .map(snapshot)
        .filter((r) => r.status !== 'CANCELED' && r.status !== 'FINISHED')
        .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    },
    async listRecent(): Promise<LiveRoomSummary[]> {
      await guard();
      if (scenario === 'empty') return [];
      const day = 86_400_000;
      return [
        { id: 'r-past-1', mode: 'LIVE_RACE', targetDistanceM: 3000, targetSeconds: null, finishedAt: Date.now() - day, myRank: 2, memberCount: 4, myFinished: true },
        { id: 'r-past-2', mode: 'TOGETHER', targetDistanceM: 5000, targetSeconds: null, finishedAt: Date.now() - 3 * day, myRank: null, memberCount: 3, myFinished: true },
      ];
    },
    async listFriends() {
      await wait(DELAY_MS);
      return FRIENDS;
    },
    async create(input: CreateRoomInput) {
      await wait(DELAY_MS);
      const id = `r-${nextId++}`;
      const invitees = FRIENDS.filter((f) => input.inviteeIds.includes(f.userId));
      const room: LiveRoom = {
        id,
        mode: input.mode,
        targetDistanceM: input.targetDistanceM,
        targetSeconds: input.targetSeconds,
        course: input.courseId ? { id: input.courseId, name: COURSE_NAMES[input.courseId] ?? '코스' } : null,
        scheduledAt: input.scheduledAt,
        status: 'WAITING',
        startsAt: null,
        members: [member(ME, 'JOINED', true), ...invitees.map((f) => member(f, 'INVITED'))],
      };
      rooms.set(id, { room, createdAt: Date.now(), scenario, simulate: true, meReady: false, meJoined: true, left: false, allReadyAt: null });
      return snapshot(rooms.get(id)!);
    },
    async get(roomId) {
      if (scenario === 'loading') await new Promise(() => {});
      if (scenario === 'error') throw new LiveRoomError('network', '서버에 연결하지 못했어요');
      return snapshot(find(roomId));
    },
    async join(roomId) {
      await wait(DELAY_MS);
      const s = find(roomId);
      s.meJoined = true;
      return snapshot(s);
    },
    async setReady(roomId, ready) {
      await wait(DELAY_MS / 2);
      const s = find(roomId);
      s.meReady = ready;
      return snapshot(s);
    },
    async getResult(roomId) {
      await wait(DELAY_MS);
      const r = results.get(roomId);
      if (!r) throw new LiveRoomError('notFound', '결과가 아직 없어요');
      return r;
    },
    async rematch(roomId) {
      await wait(DELAY_MS);
      const prev = results.get(roomId) ?? null;
      const s = rooms.get(roomId);
      if (!s) throw new LiveRoomError('notFound', '방을 찾을 수 없어요');
      // 같은 조건 · 같은 사람으로 새 방을 만든다 (TGT-012 재대결)
      const inviteeIds = (prev ? prev.entries.map((e) => e.userId) : s.room.members.map((m) => m.userId)).filter((id) => id !== ME.userId);
      return this.create({
        mode: s.room.mode,
        targetDistanceM: s.room.targetDistanceM,
        targetSeconds: s.room.targetSeconds,
        courseId: s.room.course?.id ?? null,
        scheduledAt: null,
        inviteeIds,
      });
    },
    async leave(roomId) {
      await wait(DELAY_MS);
      find(roomId).left = true;
    },
    async cancel(roomId) {
      await wait(DELAY_MS);
      const s = find(roomId);
      // 45.1장: 방 상태 전이는 서버가 정한다. 시작 전 방만 취소할 수 있다.
      if (s.room.status === 'RUNNING' || s.room.status === 'FINISHED') throw new LiveRoomError('notFound', '이미 시작한 방은 취소할 수 없어요');
      s.room = { ...s.room, status: 'CANCELED' };
      s.left = true;
    },
  };
}

/** 개발용: 친구 2명이 차례로 들어와 준비하는 방을 바로 만든다. */
export function seedDemoRoom(scenario: LiveScenario): string {
  seed();
  const id = `r-demo-${nextId++}`;
  const room: LiveRoom = {
    id,
    mode: 'LIVE_RACE',
    targetDistanceM: 5000,
    targetSeconds: null,
    course: null,
    scheduledAt: null,
    status: 'WAITING',
    startsAt: null,
    members: [member(ME, 'JOINED', true), member(FRIENDS[0], 'INVITED'), member(FRIENDS[1], 'INVITED'), member(FRIENDS[2], 'INVITED')],
  };
  rooms.set(id, { room, createdAt: Date.now(), scenario, simulate: true, meReady: false, meJoined: true, left: false, allReadyAt: null });
  return id;
}

/** 개발용: 바로 달리는 중인 방. /together/demo/live?mode=… 로 Live 화면을 연다. */
export function seedDemoRunningRoom(mode: LiveRoom['mode'], members = 3): string {
  seed();
  const id = `r-live-${nextId++}`;
  const room: LiveRoom = {
    id,
    mode,
    targetDistanceM: mode === 'TIME_ATTACK' ? null : 3000,
    targetSeconds: mode === 'TIME_ATTACK' ? 1200 : null,
    course: null,
    scheduledAt: null,
    status: 'RUNNING',
    startsAt: Date.now(),
    members: [member(ME, 'READY', true), ...FRIENDS.slice(0, members).map((f) => member(f, 'READY'))],
  };
  rooms.set(id, { room, createdAt: Date.now(), scenario: 'normal', simulate: false, meReady: true, meJoined: true, left: false, allReadyAt: Date.now() });
  return id;
}
