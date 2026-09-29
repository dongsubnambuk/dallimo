import { getRunPolicySync } from '@/entities/run/policy';

import type { LiveMemberState, LiveResult, LiveResultEntry, LiveRoom } from '../types';
import type { LiveChannel, LiveEvent, MyRunState } from './liveChannel';
import { storeLiveResult } from './mockLiveRoomRepository';

// 개발 빌드 QA용 Live 상황 (SCREEN-SPECS Together: disconnected, reconnecting, DNF, finished)
export const LIVE_RUN_SCENARIOS = ['normal', 'memberDisconnected', 'dnf', 'offline'] as const;
export type LiveRunScenario = (typeof LIVE_RUN_SCENARIOS)[number];

export function parseLiveRunScenario(value: unknown): LiveRunScenario {
  if (!__DEV__) return 'normal';
  return (LIVE_RUN_SCENARIOS as readonly unknown[]).includes(value) ? (value as LiveRunScenario) : 'normal';
}

// 다른 참가자의 페이스(초/km). 같은 방이면 같은 흐름이 나오도록 순서대로 준다.
const PACES = [300, 332, 318, 345, 310];

type Options = {
  room: LiveRoom;
  scenario: LiveRunScenario;
  // 엔진과 같은 시계(개발용 배속 포함)
  now: () => number;
  speed: number;
};

// WebSocket 연동 전 mock. 서버 broadcast 간격(run.live_state_interval_sec)마다 참가자 상태를 보낸다.
export function createMockLiveChannel({ room, scenario, now, speed }: Options): LiveChannel {
  const policy = getRunPolicySync();
  const startedAt = now();
  const others = room.members.filter((m) => !m.isMe && m.status !== 'INVITED');
  const meInfo = room.members.find((m) => m.isMe);
  let me: MyRunState = { distanceM: 0, elapsedSec: 0, paceSec: null, status: 'RUNNING' };
  let listener: ((e: LiveEvent) => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let connected = true;
  let done = false;
  // 끊겼던 동안 마지막으로 받은 상태 (stale)
  let lastMembers: LiveMemberState[] = [];
  const finished = new Map<string, number>();
  // 함께 달리기: 친구가 한 번 응원한다 (QA)
  let cheered = false;

  const target = room.targetDistanceM;
  const limit = room.targetSeconds;
  // 대략적인 전체 소요 시간(초). 상황 흉내 구간을 비율로 잡는 데 쓴다.
  const expected = limit ?? ((target ?? 5000) / 1000) * 320;

  const otherState = (i: number, elapsed: number): LiveMemberState => {
    const m = others[i];
    const pace = PACES[i % PACES.length];
    const wobble = 1 + 0.03 * Math.sin(elapsed / 50 + i);
    let distance = (elapsed / pace) * 1000 * wobble;
    let status: LiveMemberState['status'] = 'RUNNING';
    let finishSec: number | null = finished.get(m.userId) ?? null;

    if (scenario === 'dnf' && i === 1 && elapsed > expected * 0.45) {
      return { userId: m.userId, name: m.name, isMe: false, status: 'DNF', distanceM: (expected * 0.45 * 1000) / pace, elapsedSec: expected * 0.45, paceSec: pace, finishSec: null };
    }
    if (target != null && distance >= target) {
      if (finishSec == null) {
        finishSec = Math.round(elapsed);
        finished.set(m.userId, finishSec);
      }
      distance = target;
      status = 'FINISHED';
    } else if (limit != null && elapsed >= limit) {
      status = 'FINISHED';
    }
    if (scenario === 'memberDisconnected' && i === 0 && elapsed > expected * 0.25 && elapsed < expected * 0.4 && status === 'RUNNING') {
      const stale = lastMembers.find((x) => x.userId === m.userId);
      return { ...(stale ?? { userId: m.userId, name: m.name, isMe: false, distanceM: 0, elapsedSec: 0, paceSec: pace, finishSec: null }), status: 'DISCONNECTED' };
    }
    return { userId: m.userId, name: m.name, isMe: false, status, distanceM: distance, elapsedSec: Math.min(elapsed, limit ?? elapsed), paceSec: pace, finishSec };
  };

  const tick = () => {
    if (done) return;
    const elapsed = (now() - startedAt) / 1000;
    const offline = scenario === 'offline' && elapsed > expected * 0.2 && elapsed < expected * 0.35;
    if (offline !== !connected) {
      connected = !offline;
      listener?.({ type: 'CONNECTION', connected });
    }
    const members: LiveMemberState[] = [
      {
        userId: meInfo?.userId ?? 'me',
        name: meInfo?.name ?? '나',
        isMe: true,
        status: me.status,
        distanceM: me.distanceM,
        elapsedSec: me.elapsedSec,
        paceSec: me.paceSec,
        finishSec: me.status === 'FINISHED' && target != null ? Math.round(me.elapsedSec) : null,
      },
      ...others.map((_, i) => otherState(i, elapsed)),
    ];
    // 연결이 끊긴 동안은 새 상태가 오지 않는다. 화면은 마지막 상태를 그대로 보여준다.
    if (!connected) return;
    lastMembers = members;
    listener?.({ type: 'MEMBER_STATE', members });
    if (room.mode === 'TOGETHER' && !cheered && others.length && elapsed > expected * 0.15) {
      cheered = true;
      listener?.({ type: 'CHEER', fromUserId: others[0].userId, fromName: others[0].name, toMe: true });
    }

    if (members.every((m) => m.status === 'FINISHED' || m.status === 'DNF')) {
      done = true;
      const result = buildResult(room, members, me.runId ?? null);
      storeLiveResult(result);
      listener?.({ type: 'ROOM_FINISHED', result });
    }
  };

  return {
    connect(onEvent) {
      listener = onEvent;
      tick();
      timer = setInterval(tick, Math.max(100, (policy.liveStateIntervalSec * 1000) / speed));
    },
    sendState(state) {
      me = state;
      // 내가 끝나면 바로 반영해 방 종료를 빨리 판단한다
      if (state.status !== 'RUNNING') tick();
    },
    sendCheer() {
      return connected && !done;
    },
    close() {
      if (timer) clearInterval(timer);
      timer = null;
      listener = null;
    },
  };
}

// 레이스: 완주 기록 순, 타임 어택: 거리 순, 함께: 순위 없음. 중도 포기는 순위 없이 맨 뒤.
function buildResult(room: LiveRoom, members: LiveMemberState[], myRunId: string | null): LiveResult {
  const ranked = [...members].sort((a, b) => {
    if (a.status === 'DNF' || b.status === 'DNF') return (a.status === 'DNF' ? 1 : 0) - (b.status === 'DNF' ? 1 : 0);
    if (room.mode === 'LIVE_RACE') return (a.finishSec ?? Infinity) - (b.finishSec ?? Infinity);
    return b.distanceM - a.distanceM;
  });
  const entries: LiveResultEntry[] = ranked.map((m, i) => ({
    userId: m.userId,
    name: m.name,
    isMe: m.isMe,
    rank: room.mode === 'TOGETHER' || m.status === 'DNF' ? null : i + 1,
    status: m.status === 'DNF' ? 'DNF' : 'FINISHED',
    timeSec: room.mode === 'LIVE_RACE' || room.mode === 'TOGETHER' ? m.finishSec : m.elapsedSec,
    distanceM: m.distanceM,
  }));
  return { roomId: room.id, mode: room.mode, targetDistanceM: room.targetDistanceM, targetSeconds: room.targetSeconds, finishedAt: Date.now(), entries, myRunId };
}
