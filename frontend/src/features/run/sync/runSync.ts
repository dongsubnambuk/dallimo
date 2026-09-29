import { RunApiError, toPointDto, toWorkoutStepDto, type FinishRunResponse, type RunApi } from '@/entities/run/api/runApi';
import { flattenBlocks } from '@/entities/workout/flatten';
import { parseWorkoutPlan } from '@/entities/workout/plan';
import { stepResults } from '@/entities/workout/tracker';
import type { ApiErrorCode } from '@/shared/api/contract';

import { parseBoundaries } from '../engine/intervalTracking';
import type { LocalRun, LocalRunStore, SyncBatch } from '../engine/localRunStore';

// 29.4장 Sync Worker: 러닝 하나를 서버까지 올린다.
// 서버 Run 만들기(clientRunUuid) → 연속 seq Batch 기록 후 전송(batchUuid) → 성공 ACKED · 실패 backoff → 끝난 러닝이면 finish.
// 앱이 꺼지거나 네트워크가 바뀌어도 SQLite 상태에서 이어서 한다.

// 명세에 값이 없어 정한 시작값 (FOUNDATION-DECISION-LOG 28항)
export const SYNC_POLICY = {
  // Batch 하나에 넣는 최대 point 수 (1초에 1개면 1분)
  batchMaxPoints: 60,
  // 실패하면 2초, 4초, 8초 … 최대 5분 뒤 다시
  backoffBaseMs: 2_000,
  backoffMaxMs: 300_000,
};

// 다시 보내도 결과가 같은 오류는 재시도하지 않는다 (50.3장 FAILED, MOCK-CONTRACT-CHECK 1.1)
const FATAL: readonly (ApiErrorCode | 'NETWORK')[] = ['RUN_POINT_INVALID', 'IDEMPOTENCY_CONFLICT', 'VALIDATION_ERROR', 'RESOURCE_FORBIDDEN'];

export type SyncDeps = {
  store: LocalRunStore;
  api: RunApi;
  now: () => number;
  uuid: () => string;
  online: () => boolean;
  // 남은(서버에 없는) point 수가 바뀔 때
  onProgress?: (unsynced: number) => void;
};

export type SyncOutcome = {
  // synced: 서버에서 끝남(finish까지). pending: 아직 남음(달리는 중 · 오프라인 · 재시도 대기). failed: 올릴 수 없는 오류
  state: 'synced' | 'pending' | 'failed';
  unsynced: number;
  // 다시 시도할 시각 (pending일 때)
  retryAt: number | null;
  finish: FinishRunResponse | null;
};

export const backoffMs = (retryCount: number) => Math.min(SYNC_POLICY.backoffMaxMs, SYNC_POLICY.backoffBaseMs * 2 ** Math.max(0, retryCount - 1));

// 계획(plan JSON)에 둔 서버 연결 값. 함께 달리기는 방 id(45.1장), 도전은 도전 id(CHL-001). 서버가 이 Run을 잇는다
export function planValue(plan: string | null, key: 'liveRoomId' | 'challengeId'): string | null {
  try {
    const p: unknown = plan ? JSON.parse(plan) : null;
    const id = p && typeof p === 'object' ? (p as Record<string, unknown>)[key] : null;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

// 인터벌 달리기: 계획의 인터벌 (plan.workout JSON)
function planWorkout(plan: string | null) {
  try {
    const p: unknown = plan ? JSON.parse(plan) : null;
    const w = p && typeof p === 'object' ? (p as Record<string, unknown>).workout : null;
    return typeof w === 'string' ? parseWorkoutPlan(w) : null;
  } catch {
    return null;
  }
}

function workoutLink(run: LocalRun) {
  const w = run.mode === 'INTERVAL' ? planWorkout(run.plan) : null;
  return w ? { templateId: w.id, version: w.version, name: w.name } : null;
}

// 인터벌 달리기의 구간 결과: 계획의 구간 순서 + 기기에 저장한 경계
function workoutSteps(run: LocalRun) {
  const w = run.mode === 'INTERVAL' ? planWorkout(run.plan) : null;
  if (!w) return undefined;
  return stepResults(flattenBlocks(w.blocks), parseBoundaries(run.workoutProgress)).map(toWorkoutStepDto);
}

export async function syncRun(runUuid: string, deps: SyncDeps): Promise<SyncOutcome> {
  const { store, api } = deps;
  const outcome = async (state: SyncOutcome['state'], retryAt: number | null = null): Promise<SyncOutcome> => ({
    state,
    unsynced: await store.countUnsynced(runUuid),
    retryAt,
    finish: null,
  });

  let run = await store.getRun(runUuid);
  if (!run || run.syncState === 'FAILED') return outcome('failed');
  if (run.syncState === 'SYNCED') return outcome('synced');
  if (!deps.online()) return outcome('pending');

  try {
    let runId = run.serverRunId;
    if (!runId) {
      const created = await api.create({
        clientRunUuid: run.clientRunUuid,
        mode: run.mode,
        courseId: run.courseId,
        challengeId: planValue(run.plan, 'challengeId'),
        liveRoomId: planValue(run.plan, 'liveRoomId'),
        startedAt: new Date(run.startedAt).toISOString(),
        workout: workoutLink(run),
      });
      runId = created.runId;
      await store.setServerRunId(runUuid, runId);
    }

    for (;;) {
      let batch: SyncBatch | undefined = (await store.getOpenBatches(runUuid))[0];
      if (!batch) {
        const range = await store.nextBatchRange(runUuid, SYNC_POLICY.batchMaxPoints);
        if (!range) break;
        const b = { batchUuid: deps.uuid(), clientRunUuid: runUuid, ...range };
        await store.createBatch(b);
        batch = { ...b, status: 'PENDING', retryCount: 0, nextRetryAt: null };
      }
      if (batch.status === 'RETRY_WAIT' && batch.nextRetryAt != null && batch.nextRetryAt > deps.now()) return outcome('pending', batch.nextRetryAt);

      await store.updateBatch(batch.batchUuid, { status: 'SENDING' });
      const points = await store.getPointRange(runUuid, batch.fromSeq, batch.toSeq);
      try {
        await api.uploadPoints(runId, { batchUuid: batch.batchUuid, fromSeq: batch.fromSeq, toSeq: batch.toSeq, points: points.map(toPointDto) });
      } catch (e) {
        if (e instanceof RunApiError && FATAL.includes(e.code)) {
          await store.updateBatch(batch.batchUuid, { status: 'FAILED' });
          await store.setRunSyncState(runUuid, 'FAILED');
          return outcome('failed');
        }
        if (e instanceof RunApiError && e.code === 'RUN_NOT_FOUND') throw e;
        const retryCount = batch.retryCount + 1;
        const retryAt = deps.now() + backoffMs(retryCount);
        await store.updateBatch(batch.batchUuid, { status: 'RETRY_WAIT', retryCount, nextRetryAt: retryAt });
        return outcome('pending', retryAt);
      }
      await store.ackBatch(batch.batchUuid);
      deps.onProgress?.(await store.countUnsynced(runUuid));
    }

    // 달리는 중이면 여기까지. 끝난 러닝이면 finish (25.3장 final batch flush → server summary)
    run = await store.getRun(runUuid);
    if (!run || run.status === 'RUNNING' || run.status === 'PAUSED') return outcome('pending');
    if (run.status === 'CANCELED') {
      await store.setRunSyncState(runUuid, 'SYNCED');
      return outcome('synced');
    }
    const finish = await api.finish(runId, {
      endedAt: new Date(run.endedAt ?? deps.now()).toISOString(),
      lastSeq: run.lastSeq,
      // 일시정지 시간은 기기만 안다 (오프라인에서 멈춘 시각은 서버에 가지 않음)
      activeSeconds: Math.round(run.elapsedMs / 1000),
      workoutSteps: workoutSteps(run),
    });
    // 42.4장: 서버에 빠진 seq가 있으면 FINISHING. 빠진 Batch를 보낸 뒤 다시 요청한다
    if (finish.status === 'FINISHING') return outcome('pending', deps.now() + SYNC_POLICY.backoffBaseMs);
    await store.setRunSyncState(runUuid, 'SYNCED');
    return { state: 'synced', unsynced: 0, retryAt: null, finish };
  } catch (e) {
    if (e instanceof RunApiError && e.code === 'RUN_NOT_FOUND') {
      // 서버가 이 Run을 모른다: 서버 id와 Batch를 지우고 처음부터 다시 올린다 (clientRunUuid 멱등)
      await store.resetSync(runUuid);
      return outcome('pending', deps.now());
    }
    if (e instanceof RunApiError && FATAL.includes(e.code)) {
      await store.setRunSyncState(runUuid, 'FAILED');
      return outcome('failed');
    }
    return outcome('pending', deps.now() + SYNC_POLICY.backoffBaseMs);
  }
}
