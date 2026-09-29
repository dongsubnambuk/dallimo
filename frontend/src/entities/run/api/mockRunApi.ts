import { getNetworkState } from '@/shared/network/network';

import { RunApiError, type FinishRunResponse, type RunApi } from './runApi';

// 42장 Run API mock 서버. 백엔드 전까지 기록 동기화가 이 서버로 올린다.
// 25.2장처럼 clientRunUuid · batchUuid 멱등을 흉내 낸다. 앱을 다시 켜면 비어 있다(서버가 Run을 모르면 앱이 처음부터 다시 올린다).
type ServerRun = {
  runId: string;
  clientRunUuid: string;
  startedAt: string;
  status: 'RUNNING' | 'PAUSED' | 'FINISHED';
  lastSeq: number;
  distanceM: number;
  last: { latitude: number; longitude: number } | null;
  batches: Map<string, { fromSeq: number; toSeq: number; count: number }>;
  finished: FinishRunResponse | null;
};

const LATENCY_MS = 250;
let nextRunId = 1;

// 두 point 거리(m). 서버는 앱이 보낸 누적 거리를 믿지 않고 point로 다시 계산한다 (42.3장)
function haversineM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const r = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function createMockRunApi(): RunApi {
  const runs = new Map<string, ServerRun>();
  const byClient = new Map<string, string>();

  const call = async <T>(fn: () => T): Promise<T> => {
    if (getNetworkState() === 'offline') throw new RunApiError('NETWORK');
    await new Promise((r) => setTimeout(r, LATENCY_MS));
    if (getNetworkState() === 'offline') throw new RunApiError('NETWORK');
    return fn();
  };
  const find = (runId: string) => {
    const run = runs.get(runId);
    if (!run) throw new RunApiError('RUN_NOT_FOUND');
    return run;
  };

  return {
    create: (req) =>
      call(() => {
        const existing = byClient.get(req.clientRunUuid);
        const run = existing ? runs.get(existing)! : null;
        if (run) return { runId: run.runId, clientRunUuid: run.clientRunUuid, status: run.finished ? 'FINISHED' : run.status, serverTime: new Date().toISOString() };
        const runId = `srv-${nextRunId++}`;
        runs.set(runId, {
          runId,
          clientRunUuid: req.clientRunUuid,
          startedAt: req.startedAt,
          status: 'RUNNING',
          lastSeq: 0,
          distanceM: 0,
          last: null,
          batches: new Map(),
          finished: null,
        });
        byClient.set(req.clientRunUuid, runId);
        return { runId, clientRunUuid: req.clientRunUuid, status: 'RUNNING', serverTime: new Date().toISOString() };
      }),

    uploadPoints: (runId, req) =>
      call(() => {
        const run = find(runId);
        if (!req.points.length) throw new RunApiError('VALIDATION_ERROR');
        const seqs = req.points.map((p) => p.seq);
        if (Math.min(...seqs) !== req.fromSeq || Math.max(...seqs) !== req.toSeq) throw new RunApiError('RUN_POINT_INVALID');
        const seen = run.batches.get(req.batchUuid);
        if (seen) {
          // 같은 Batch를 다시 보냄: 내용이 같으면 멱등 성공, 다르면 충돌
          if (seen.fromSeq !== req.fromSeq || seen.toSeq !== req.toSeq || seen.count !== req.points.length) throw new RunApiError('IDEMPOTENCY_CONFLICT');
          return { batchUuid: req.batchUuid, accepted: true, lastAcceptedSeq: run.lastSeq };
        }
        if (run.finished) throw new RunApiError('RUN_INVALID_STATE');
        run.batches.set(req.batchUuid, { fromSeq: req.fromSeq, toSeq: req.toSeq, count: req.points.length });
        for (const p of req.points) {
          if (p.seq <= run.lastSeq) continue;
          if (run.last) run.distanceM += haversineM(run.last, p);
          run.last = { latitude: p.latitude, longitude: p.longitude };
          run.lastSeq = p.seq;
        }
        return { batchUuid: req.batchUuid, accepted: true, lastAcceptedSeq: run.lastSeq };
      }),

    pause: (runId) =>
      call(() => {
        const run = find(runId);
        if (run.status !== 'RUNNING') throw new RunApiError('RUN_INVALID_STATE');
        run.status = 'PAUSED';
        return { status: 'PAUSED' as const, pausedAt: new Date().toISOString() };
      }),

    resume: (runId) =>
      call(() => {
        const run = find(runId);
        if (run.status !== 'PAUSED') throw new RunApiError('RUN_INVALID_STATE');
        run.status = 'RUNNING';
        return { status: 'RUNNING' as const, resumedAt: new Date().toISOString() };
      }),

    finish: (runId, req) =>
      call(() => {
        const run = find(runId);
        if (run.finished) return run.finished;
        const base = { runId, distanceM: Math.round(run.distanceM), elapsedSeconds: 0, avgPaceSecPerKm: 0 };
        // 42.4장: 서버에 저장된 마지막 seq가 모자라면 확정하지 않는다
        if (run.lastSeq < req.lastSeq) return { ...base, status: 'FINISHING', verificationStatus: 'NONE' };
        // 일시정지 시간을 서버가 모르므로(42장에 시각 없음) mock은 시작~종료 전체 시간을 쓴다
        const elapsedSeconds = Math.max(0, Math.round((Date.parse(req.endedAt) - Date.parse(run.startedAt)) / 1000));
        run.status = 'FINISHED';
        run.finished = {
          ...base,
          status: 'FINISHED',
          elapsedSeconds,
          avgPaceSecPerKm: run.distanceM > 0 ? Math.round(elapsedSeconds / (run.distanceM / 1000)) : 0,
          verificationStatus: 'PENDING',
        };
        return run.finished;
      }),
  };
}
