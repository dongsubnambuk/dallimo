import { AppState } from 'react-native';

import { runApi, runResultRepository } from '@/entities/run/api';
import { getNetworkState, onNetworkChange } from '@/shared/network/network';
import { createUuid } from '@/shared/uuid';

import { getRunStore } from '../engine/runStore';
import { syncRun, type SyncOutcome } from './runSync';

// 기록 동기화를 언제 돌릴지 정한다. 한 번에 하나씩 돌린다.
// 앱을 켤 때 · 앱으로 돌아올 때 · 인터넷이 다시 연결될 때 · 재시도 시각 · 러닝 중 주기적으로(엔진이 요청).
// 29.3장: 백그라운드 위치 task에서는 네트워크를 부르지 않는다. 앱이 앞에 있을 때만 돈다.

type Listener = (runUuid: string, outcome: SyncOutcome) => void;
const listeners = new Set<Listener>();
let queue: Promise<unknown> = Promise.resolve();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pendingAll = false;

const deps = async (onProgress?: (n: number) => void) => ({
  store: await getRunStore(),
  api: runApi,
  now: Date.now,
  uuid: createUuid,
  online: () => getNetworkState() === 'online',
  onProgress,
});

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch((e) => console.warn('[sync]', e));
  return next;
}

async function report(runUuid: string, out: SyncOutcome) {
  // 기기에만 있던 결과가 서버에서 끝났다
  if (out.state === 'synced' && out.finish) await runResultRepository.markSynced(runUuid);
  listeners.forEach((l) => l(runUuid, out));
}

function scheduleRetry(at: number | null) {
  if (at == null) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(
    () => {
      retryTimer = null;
      requestSync();
    },
    Math.max(500, at - Date.now()),
  );
}

/** 서버에 올리지 못한 모든 러닝을 올린다. 이미 도는 중이면 끝난 뒤 한 번 더. */
export function requestSync(): void {
  if (pendingAll) return;
  pendingAll = true;
  enqueue(async () => {
    pendingAll = false;
    if (getNetworkState() !== 'online') return;
    const d = await deps();
    let nextRetry: number | null = null;
    for (const run of await d.store.listUnsyncedRuns()) {
      const out = await syncRun(run.clientRunUuid, d);
      await report(run.clientRunUuid, out);
      if (out.retryAt != null) nextRetry = nextRetry == null ? out.retryAt : Math.min(nextRetry, out.retryAt);
    }
    scheduleRetry(nextRetry);
  });
}

/** 러닝 종료 때 남은 point를 바로 올리고 finish까지. 진행 중 남은 수를 알려준다. */
export function syncRunNow(runUuid: string, onProgress: (unsynced: number) => void): Promise<SyncOutcome> {
  return enqueue(async () => {
    const out = await syncRun(runUuid, await deps(onProgress));
    await report(runUuid, out);
    scheduleRetry(out.retryAt);
    return out;
  });
}

export function onSyncResult(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let started = false;

/** 앱을 켤 때 한 번. 50.3장: 꺼질 때 SENDING이던 Batch를 되돌리고 남은 기록을 올린다. */
export function startRunSync(): void {
  if (started) return;
  started = true;
  enqueue(async () => (await getRunStore()).resetSendingBatches()).then(requestSync);
  onNetworkChange((s) => {
    if (s === 'online') requestSync();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') requestSync();
  });
}
