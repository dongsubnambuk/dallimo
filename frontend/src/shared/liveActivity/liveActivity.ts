import { requireOptionalNativeModule } from 'expo';

// 러닝 라이브 액티비티 (잠금 화면 · 다이내믹 아일랜드, 결정 로그 83항). 로컬 네이티브 모듈 modules/dallimo-live-activity는 아이폰 빌드에만 있다.
// 웹 · 안드로이드는 아무것도 하지 않는다. 개발 중 웹에서는 마지막으로 보낸 상태를 globalThis.__dallimoLiveActivity로 본다.
// 모양은 targets/live-activity/DallimoRunAttributes.swift ContentState와 같다

export type LiveActivityPerson = {
  name: string;
  distanceKm: string;
  progress: number;
  me: boolean;
  status: 'running' | 'finished' | 'dnf' | 'away';
};

export type LiveActivityState = {
  status: 'running' | 'paused' | 'finished';
  distanceKm: string;
  pace: string;
  elapsedSec: number;
  // 달리는 중이면 "시간 0"인 시각(epoch 초). 위젯이 여기서부터 센다
  timerStart: number | null;
  stripLabel?: string;
  stripValue?: string;
  stripTone?: 'accent' | 'warning' | 'neutral';
  people: LiveActivityPerson[];
};

type DallimoLiveActivityModule = {
  isEnabled(): boolean;
  start(title: string, stateJson: string): Promise<string | null>;
  update(id: string, stateJson: string): Promise<void>;
  end(id: string, stateJson: string, dismissAfterSec: number): Promise<void>;
  endAll(): Promise<void>;
};

const native = requireOptionalNativeModule<DallimoLiveActivityModule>('DallimoLiveActivity');

export interface LiveActivityTransport {
  // 이 기기에서 쓸 수 있나 (아이폰 iOS 16.2+ · 설정에서 켜짐)
  enabled(): boolean;
  start(title: string, state: LiveActivityState): Promise<string | null>;
  update(id: string, state: LiveActivityState): Promise<void>;
  // state가 있으면 저장 요약을 dismissAfterSec 동안 보여 준 뒤 사라진다. 없으면 바로 지운다
  end(id: string, state: LiveActivityState | null, dismissAfterSec?: number): Promise<void>;
  endAll(): Promise<void>;
}

const nativeTransport = (mod: DallimoLiveActivityModule): LiveActivityTransport => ({
  enabled: () => {
    try {
      return mod.isEnabled();
    } catch {
      return false;
    }
  },
  start: (title, state) => mod.start(title, JSON.stringify(state)).catch(() => null),
  update: (id, state) => mod.update(id, JSON.stringify(state)).catch(() => undefined),
  end: (id, state, dismissAfterSec = 0) => mod.end(id, state ? JSON.stringify(state) : '', dismissAfterSec).catch(() => undefined),
  endAll: () => mod.endAll().catch(() => undefined),
});

// 개발 중 웹: 보낸 상태를 남겨 화면 · 흐름을 확인한다
type MockDebug = { title: string | null; state: LiveActivityState | null; ended: boolean; updates: number };
function mockTransport(): LiveActivityTransport {
  const debug: MockDebug = { title: null, state: null, ended: false, updates: 0 };
  (globalThis as { __dallimoLiveActivity?: MockDebug }).__dallimoLiveActivity = debug;
  return {
    enabled: () => true,
    start: async (title, state) => {
      Object.assign(debug, { title, state, ended: false, updates: 0 });
      return 'mock-activity';
    },
    update: async (_id, state) => {
      debug.state = state;
      debug.updates += 1;
    },
    end: async (_id, state) => {
      if (state) debug.state = state;
      debug.ended = true;
    },
    endAll: async () => {
      debug.ended = true;
    },
  };
}

const noTransport: LiveActivityTransport = {
  enabled: () => false,
  start: async () => null,
  update: async () => undefined,
  end: async () => undefined,
  endAll: async () => undefined,
};

export const liveActivity: LiveActivityTransport = native ? nativeTransport(native) : __DEV__ ? mockTransport() : noTransport;

/** 이 기기에 라이브 액티비티 모듈이 있나 (설정에 켜기 · 끄기를 보여 줄지) */
export const LIVE_ACTIVITY_AVAILABLE = native != null || __DEV__;
