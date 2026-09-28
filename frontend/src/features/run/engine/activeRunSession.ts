import { useSyncExternalStore } from 'react';

import { createDeviceRunningEngine } from './deviceRunningEngine';
import { createMockRunningEngine, type ActiveRunScenario } from './mockRunningEngine';
import type { ActiveRunSnapshot, RunningEngine } from './runningEngine';

// 앱 안에서 동시에 하나의 러닝만 진행한다. 화면이 다시 그려지거나 바뀌어도 엔진은 유지된다.
let current: RunningEngine | null = null;

// device: 실제 기기 위치로 기록 (SQLite 저장, 백그라운드). mock: 개발용 가짜 러너 (상태 QA, 배속)
export type ActiveRunOptions = { kind: 'device' } | { kind: 'mock'; scenario: ActiveRunScenario; speed: number };

export function beginActiveRun(options: ActiveRunOptions): RunningEngine {
  current?.dispose();
  current = options.kind === 'device' ? createDeviceRunningEngine() : createMockRunningEngine(options);
  return current;
}

export function getActiveRun(): RunningEngine | null {
  return current;
}

export function endActiveRun() {
  current?.dispose();
  current = null;
}

/** 스냅샷 중 필요한 값만 구독한다. selector는 원시값이나 바뀔 때만 새로 만들어지는 참조를 돌려줘야 한다. */
export function useRunSnapshot<T>(engine: RunningEngine, selector: (s: ActiveRunSnapshot) => T): T {
  return useSyncExternalStore(engine.subscribe, () => selector(engine.getSnapshot()));
}
