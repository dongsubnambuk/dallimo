import { useSyncExternalStore } from 'react';

import { createDeviceRunningEngine } from './deviceRunningEngine';
import { createMockRunningEngine, type ActiveRunScenario } from './mockRunningEngine';
import type { ActiveRunSnapshot, RunningEngine } from './runningEngine';
import { attachRunAlerts } from '../notifications/runAlerts';

// 앱 안에서 동시에 하나의 러닝만 진행한다. 화면이 다시 그려지거나 바뀌어도 엔진은 유지된다.
let current: RunningEngine | null = null;
// 실제 기록(device) 러닝의 달리는 중 알림
let detachAlerts: (() => void) | null = null;

// device: 실제 기기 위치로 기록 (SQLite 저장, 백그라운드). mock: 개발용 가짜 러너 (상태 QA, 배속)
export type ActiveRunOptions = { kind: 'device' } | { kind: 'mock'; scenario: ActiveRunScenario; speed: number };

export function beginActiveRun(options: ActiveRunOptions): RunningEngine {
  stop();
  current = options.kind === 'device' ? createDeviceRunningEngine() : createMockRunningEngine(options);
  if (options.kind === 'device') detachAlerts = attachRunAlerts(current);
  return current;
}

function stop() {
  detachAlerts?.();
  detachAlerts = null;
  current?.dispose();
}

/** 달리는 중(일시정지 · 복구 포함)인가. 이때는 서버 Push를 화면에 띄우지 않는다 */
export function isRunning(): boolean {
  const s = current?.getSnapshot().status;
  return s === 'RUNNING' || s === 'PAUSED' || s === 'RECOVERY';
}

export function getActiveRun(): RunningEngine | null {
  return current;
}

export function endActiveRun() {
  stop();
  current = null;
}

/** 스냅샷 중 필요한 값만 구독한다. selector는 원시값이나 바뀔 때만 새로 만들어지는 참조를 돌려줘야 한다. */
export function useRunSnapshot<T>(engine: RunningEngine, selector: (s: ActiveRunSnapshot) => T): T {
  return useSyncExternalStore(engine.subscribe, () => selector(engine.getSnapshot()));
}
