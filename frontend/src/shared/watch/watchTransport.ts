import { useEffect, useState } from 'react';

import { requireOptionalNativeModule } from 'expo';

// Apple Watch 연결 (WatchConnectivity). 로컬 네이티브 모듈 modules/dallimo-watch는 아이폰 개발 빌드에만 있다.
// 웹 · 개발 확인용으로는 가짜 워치를 쓴다 (globalThis.__dallimoWatch로 보낸 메시지를 보고 명령을 보낼 수 있다).

export type WatchState = {
  // 이 기기가 워치와 연결할 수 있나 (아이폰)
  supported: boolean;
  paired: boolean;
  // 워치에 달리모 앱이 있나
  installed: boolean;
  // 지금 워치 앱과 바로 주고받을 수 있나 (워치 앱이 켜져 있음)
  reachable: boolean;
};

export type WatchCommand = 'pause' | 'resume' | 'finish' | 'next';

// 워치 → 휴대폰. watchRun: 워치 단독 기록 파일이 도착했다 (받은 편지함에 있다, 결정 로그 81항)
export type WatchIncoming = { t: 'cmd'; cmd: WatchCommand } | { t: 'hr'; bpm: number; at: number } | { t: 'hello' } | { t: 'watchRun' };

// 워치가 혼자 기록해 보낸 러닝 파일 (id = 러닝 uuid)
export type WatchRunFile = { id: string; json: string };

export type WatchPayload = Record<string, unknown>;

export interface WatchTransport {
  state(): WatchState;
  // 워치 앱을 켠다 (HealthKit startWatchApp, 워치에서 운동 세션이 시작된다)
  launch(): Promise<boolean>;
  // 바로 보낸다. 워치 앱이 꺼져 있으면 버린다 (초마다 바뀌는 값)
  send(message: WatchPayload): void;
  // 마지막 상태를 남긴다. 워치 앱이 나중에 켜지면 받는다
  setContext(context: WatchPayload): void;
  onMessage(fn: (m: WatchIncoming) => void): () => void;
  onState(fn: (s: WatchState) => void): () => void;
  // 받아 두고 아직 넣지 않은 워치 단독 기록
  pendingRuns(): Promise<WatchRunFile[]>;
  // 기기 저장소에 넣었다: 받은 편지함에서 지운다
  ackRun(id: string): void;
}

type Subscription = { remove(): void };
type DallimoWatchModule = {
  getState(): WatchState;
  startWatchApp(): Promise<boolean>;
  sendMessage(message: WatchPayload): void;
  updateContext(context: WatchPayload): void;
  pendingRuns(): WatchRunFile[];
  ackRun(id: string): void;
  addListener(event: 'onMessage', fn: (m: WatchPayload) => void): Subscription;
  addListener(event: 'onState', fn: (s: WatchState) => void): Subscription;
};

const nativeWatch = requireOptionalNativeModule<DallimoWatchModule>('DallimoWatch');

/** WatchConnectivity 메시지는 plist 값만 된다. null · undefined를 뺀다 */
export function toPlist(v: WatchPayload): WatchPayload {
  const out: WatchPayload = {};
  for (const [k, x] of Object.entries(v)) {
    if (x == null) continue;
    out[k] = typeof x === 'object' && !Array.isArray(x) ? toPlist(x as WatchPayload) : x;
  }
  return out;
}

function parseIncoming(m: WatchPayload): WatchIncoming | null {
  if (m.t === 'cmd' && (m.cmd === 'pause' || m.cmd === 'resume' || m.cmd === 'finish' || m.cmd === 'next')) return { t: 'cmd', cmd: m.cmd };
  if (m.t === 'hr' && typeof m.bpm === 'number' && m.bpm > 0) return { t: 'hr', bpm: Math.round(m.bpm), at: typeof m.at === 'number' ? m.at : Date.now() };
  if (m.t === 'hello') return { t: 'hello' };
  if (m.t === 'watchRun') return { t: 'watchRun' };
  return null;
}

function nativeTransport(mod: DallimoWatchModule): WatchTransport {
  return {
    state: () => mod.getState(),
    launch: () => mod.startWatchApp().catch(() => false),
    send: (m) => {
      try {
        mod.sendMessage(toPlist(m));
      } catch {
        // 워치가 없거나 꺼져 있으면 버린다
      }
    },
    setContext: (c) => {
      try {
        mod.updateContext(toPlist(c));
      } catch {
        // 페어링된 워치가 없으면 남길 곳이 없다
      }
    },
    onMessage: (fn) => {
      const sub = mod.addListener('onMessage', (m) => {
        const parsed = parseIncoming(m);
        if (parsed) fn(parsed);
      });
      return () => sub.remove();
    },
    onState: (fn) => {
      const sub = mod.addListener('onState', fn);
      return () => sub.remove();
    },
    pendingRuns: async () => {
      try {
        return mod.pendingRuns();
      } catch {
        return [];
      }
    },
    ackRun: (id) => {
      try {
        mod.ackRun(id);
      } catch {
        // 다음에 다시 넣으려 해도 이미 있어서 건너뛴다
      }
    },
  };
}

// ── 개발용 가짜 워치 ──
export const MOCK_WATCH_SCENARIOS = ['normal', 'none', 'unreachable'] as const;
export type MockWatchScenario = (typeof MOCK_WATCH_SCENARIOS)[number];

type MockWatchDebug = {
  messages: WatchPayload[];
  context: WatchPayload | null;
  launched: number;
  last(t?: string): WatchPayload | null;
  command(cmd: WatchCommand): void;
  heartRate(bpm: number): void;
  hello(): void;
  // 워치 단독 기록 파일이 도착한 것처럼 (JSON 문자열, watchRunImport 파일 모양)
  sendRun(json: string): void;
  inbox: WatchRunFile[];
  setScenario(s: MockWatchScenario): void;
};

function mockTransport(): WatchTransport {
  let scenario: MockWatchScenario = 'normal';
  const messageListeners = new Set<(m: WatchIncoming) => void>();
  const stateListeners = new Set<(s: WatchState) => void>();
  const state = (): WatchState =>
    scenario === 'none'
      ? { supported: true, paired: false, installed: false, reachable: false }
      : { supported: true, paired: true, installed: true, reachable: scenario === 'normal' };
  const emit = (m: WatchIncoming) => messageListeners.forEach((fn) => fn(m));
  const debug: MockWatchDebug = {
    messages: [],
    context: null,
    launched: 0,
    last: (t) => [...debug.messages].reverse().find((m) => t == null || m.t === t) ?? null,
    command: (cmd) => emit({ t: 'cmd', cmd }),
    heartRate: (bpm) => emit({ t: 'hr', bpm, at: Date.now() }),
    hello: () => emit({ t: 'hello' }),
    inbox: [],
    sendRun: (json) => {
      let id = `watch-run-${debug.inbox.length + 1}`;
      try {
        const parsed = JSON.parse(json) as { runUuid?: unknown };
        if (typeof parsed.runUuid === 'string') id = parsed.runUuid;
      } catch {
        // 읽을 수 없는 파일도 그대로 받는다 (넣을 때 버린다)
      }
      debug.inbox = [...debug.inbox.filter((f) => f.id !== id), { id, json }];
      emit({ t: 'watchRun' });
    },
    setScenario: (s) => {
      if (s === scenario) return;
      scenario = s;
      stateListeners.forEach((fn) => fn(state()));
    },
  };
  (globalThis as { __dallimoWatch?: MockWatchDebug }).__dallimoWatch = debug;
  return {
    state,
    launch: async () => {
      if (!state().installed) return false;
      debug.launched += 1;
      return true;
    },
    send: (m) => {
      if (!state().reachable) return;
      debug.messages.push(toPlist(m));
      if (debug.messages.length > 300) debug.messages.shift();
    },
    setContext: (c) => {
      if (state().paired) debug.context = toPlist(c);
    },
    onMessage: (fn) => {
      messageListeners.add(fn);
      return () => messageListeners.delete(fn);
    },
    onState: (fn) => {
      stateListeners.add(fn);
      return () => stateListeners.delete(fn);
    },
    pendingRuns: async () => [...debug.inbox],
    ackRun: (id) => {
      debug.inbox = debug.inbox.filter((f) => f.id !== id);
    },
  };
}

const UNSUPPORTED: WatchState = { supported: false, paired: false, installed: false, reachable: false };
const noTransport: WatchTransport = {
  state: () => UNSUPPORTED,
  launch: async () => false,
  send: () => undefined,
  setContext: () => undefined,
  onMessage: () => () => undefined,
  onState: () => () => undefined,
  pendingRuns: async () => [],
  ackRun: () => undefined,
};

/** 아이폰 개발 빌드면 WatchConnectivity, 개발 중 웹이면 가짜 워치, 그 밖(안드로이드 · 배포 웹)은 없음 */
export const watchTransport: WatchTransport = nativeWatch ? nativeTransport(nativeWatch) : __DEV__ ? mockTransport() : noTransport;

export function setMockWatchScenario(s: MockWatchScenario) {
  (globalThis as { __dallimoWatch?: MockWatchDebug }).__dallimoWatch?.setScenario(s);
}

/** 워치 연결 상태 (페어링 · 앱 설치 · 바로 연결). 바뀌면 다시 그린다 */
export function useWatchState(): WatchState {
  const [state, setState] = useState(() => watchTransport.state());
  useEffect(() => watchTransport.onState(setState), []);
  return state;
}
