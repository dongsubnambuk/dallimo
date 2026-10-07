import type { RunPoint } from '@/entities/run/types';

import type { HeartRateSample, LocalRun, LocalRunStats, LocalRunStore, RunSegment, SyncBatch } from './localRunStore';

// 웹(개발 확인용)에서 쓰는 메모리 저장소. SQLite 저장소와 같은 동작을 하지만 새로고침하면 사라진다.
type Entry = { run: LocalRun; points: (RunPoint & { synced: boolean })[]; segments: RunSegment[]; heart: HeartRateSample[] };

export function createMemoryLocalRunStore(): LocalRunStore {
  const runs = new Map<string, Entry>();
  const batches = new Map<string, SyncBatch>();
  const batchesOf = (runUuid: string) =>
    [...batches.values()].filter((b) => b.clientRunUuid === runUuid).sort((a, b) => a.fromSeq - b.fromSeq);

  const closeSegment = (e: Entry, at: number) => {
    for (const s of e.segments) if (s.endedAt == null) s.endedAt = Math.max(s.startedAt, at);
    e.run.elapsedMs = e.segments.reduce((a, s) => a + (s.endedAt != null ? s.endedAt - s.startedAt : 0), 0);
  };
  const strip = ({ synced: _synced, ...p }: RunPoint & { synced: boolean }): RunPoint => p;

  return {
    async createRun({ clientRunUuid, mode, courseId, plan, startedAt }) {
      if (runs.has(clientRunUuid)) throw new Error('run already exists');
      runs.set(clientRunUuid, {
        run: { clientRunUuid, mode, courseId, status: 'RUNNING', startedAt, endedAt: null, elapsedMs: 0, lastSeq: 0, plan, serverRunId: null, syncState: 'PENDING', workoutProgress: null },
        points: [],
        segments: [{ startedAt, endedAt: null }],
        heart: [],
      });
    },
    async findOpenRun() {
      const open = [...runs.values()].filter((e) => e.run.status === 'RUNNING' || e.run.status === 'PAUSED');
      open.sort((a, b) => b.run.startedAt - a.run.startedAt);
      return open[0] ? { ...open[0].run } : null;
    },
    async getRun(runUuid) {
      const e = runs.get(runUuid);
      return e ? { ...e.run } : null;
    },
    async setWorkoutProgress(runUuid, json) {
      const e = runs.get(runUuid);
      if (e) e.run.workoutProgress = json;
    },
    async appendHeartRate(runUuid, recordedAt, bpm) {
      const e = runs.get(runUuid);
      if (e && !e.heart.some((h) => h.recordedAt === recordedAt)) e.heart.push({ recordedAt, bpm });
    },
    async clearHeartRates() {
      for (const e of runs.values()) e.heart = [];
    },
    async getHeartRates(runUuid) {
      return [...(runs.get(runUuid)?.heart ?? [])].sort((a, b) => a.recordedAt - b.recordedAt);
    },
    async pauseRun(runUuid, at) {
      const e = runs.get(runUuid);
      if (!e) return;
      closeSegment(e, at);
      if (e.run.status === 'RUNNING') e.run.status = 'PAUSED';
    },
    async resumeRun(runUuid, at) {
      const e = runs.get(runUuid);
      if (!e || (e.run.status !== 'RUNNING' && e.run.status !== 'PAUSED')) return;
      if (!e.segments.some((s) => s.endedAt == null)) e.segments.push({ startedAt: at, endedAt: null });
      e.run.status = 'RUNNING';
    },
    async endRun(runUuid, at, status) {
      const e = runs.get(runUuid);
      if (!e) return;
      closeSegment(e, at);
      e.run.status = status;
      e.run.endedAt = at;
    },
    async importFinishedRun(r) {
      if (runs.has(r.clientRunUuid)) return false;
      const elapsedMs = r.segments.reduce((a, s) => a + Math.max(0, s.endedAt - s.startedAt), 0);
      runs.set(r.clientRunUuid, {
        run: {
          clientRunUuid: r.clientRunUuid,
          mode: r.mode,
          courseId: r.courseId,
          status: 'FINISHED',
          startedAt: r.startedAt,
          endedAt: r.endedAt,
          elapsedMs,
          lastSeq: r.points.length,
          plan: r.plan,
          serverRunId: null,
          syncState: 'PENDING',
          workoutProgress: null,
        },
        points: r.points.map((p, i) => ({ ...p, seq: i + 1, synced: false })),
        segments: r.segments.map((s) => ({ ...s })),
        heart: [...r.heart],
      });
      return true;
    },
    async appendPoints(runUuid, points) {
      const e = runs.get(runUuid);
      if (!e) return [];
      const saved = points.map((p, i) => ({ ...p, seq: e.run.lastSeq + i + 1 }));
      e.points.push(...saved.map((p) => ({ ...p, synced: false })));
      e.run.lastSeq += saved.length;
      return saved;
    },
    async getPoints(runUuid) {
      return (runs.get(runUuid)?.points ?? []).map(strip);
    },
    async getSegments(runUuid) {
      return (runs.get(runUuid)?.segments ?? []).map((s) => ({ ...s }));
    },
    async getUnsyncedRange(runUuid, limit) {
      return (runs.get(runUuid)?.points ?? [])
        .filter((p) => !p.synced)
        .slice(0, limit)
        .map(strip);
    },
    async markSynced(runUuid, fromSeq, toSeq) {
      for (const p of runs.get(runUuid)?.points ?? []) if (p.seq >= fromSeq && p.seq <= toSeq) p.synced = true;
    },
    async countUnsynced(runUuid) {
      return (runs.get(runUuid)?.points ?? []).filter((p) => !p.synced).length;
    },
    async listRuns(limit) {
      return [...runs.values()]
        .sort((a, b) => b.run.startedAt - a.run.startedAt)
        .slice(0, limit)
        .map((e): LocalRunStats => {
          const acc = e.points.map((p) => p.accuracy).filter(Number.isFinite);
          return {
            ...e.run,
            pointCount: e.points.length,
            lowAccuracyCount: e.points.filter((p) => p.qualityFlag === 'LOW_ACCURACY').length,
            jumpCount: e.points.filter((p) => p.qualityFlag === 'JUMP').length,
            avgAccuracyM: acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null,
            firstPointAt: e.points[0]?.recordedAt ?? null,
            lastPointAt: e.points[e.points.length - 1]?.recordedAt ?? null,
          };
        });
    },
    async deleteRun(runUuid) {
      runs.delete(runUuid);
      for (const b of batchesOf(runUuid)) batches.delete(b.batchUuid);
    },
    async setServerRunId(runUuid, serverRunId) {
      const e = runs.get(runUuid);
      if (e) e.run.serverRunId = serverRunId;
    },
    async setRunSyncState(runUuid, state) {
      const e = runs.get(runUuid);
      if (e) e.run.syncState = state;
    },
    async listUnsyncedRuns() {
      return [...runs.values()]
        .filter((e) => e.run.syncState === 'PENDING')
        .sort((a, b) => a.run.startedAt - b.run.startedAt)
        .map((e) => ({ ...e.run }));
    },
    async nextBatchRange(runUuid, limit) {
      const after = Math.max(0, ...batchesOf(runUuid).map((b) => b.toSeq));
      const pending = (runs.get(runUuid)?.points ?? []).filter((p) => !p.synced && p.seq > after).slice(0, limit);
      if (!pending.length) return null;
      let toSeq = pending[0].seq;
      for (const p of pending.slice(1)) {
        if (p.seq !== toSeq + 1) break;
        toSeq = p.seq;
      }
      return { fromSeq: pending[0].seq, toSeq };
    },
    async createBatch(b) {
      batches.set(b.batchUuid, { ...b, status: 'PENDING', retryCount: 0, nextRetryAt: null });
    },
    async getOpenBatches(runUuid) {
      return batchesOf(runUuid)
        .filter((b) => b.status !== 'ACKED' && b.status !== 'FAILED')
        .map((b) => ({ ...b }));
    },
    async hasFailedBatch(runUuid) {
      return batchesOf(runUuid).some((b) => b.status === 'FAILED');
    },
    async updateBatch(batchUuid, { status, retryCount, nextRetryAt }) {
      const b = batches.get(batchUuid);
      if (!b) return;
      b.status = status;
      if (retryCount != null) b.retryCount = retryCount;
      if (nextRetryAt !== undefined) b.nextRetryAt = nextRetryAt;
    },
    async ackBatch(batchUuid) {
      const b = batches.get(batchUuid);
      if (!b) return;
      b.status = 'ACKED';
      b.nextRetryAt = null;
      for (const p of runs.get(b.clientRunUuid)?.points ?? []) if (p.seq >= b.fromSeq && p.seq <= b.toSeq) p.synced = true;
    },
    async getPointRange(runUuid, fromSeq, toSeq) {
      return (runs.get(runUuid)?.points ?? []).filter((p) => p.seq >= fromSeq && p.seq <= toSeq).map(strip);
    },
    async resetSendingBatches() {
      for (const b of batches.values()) {
        if (b.status === 'SENDING') {
          b.status = 'RETRY_WAIT';
          b.nextRetryAt = null;
        }
      }
    },
    async resetSync(runUuid) {
      for (const b of batchesOf(runUuid)) batches.delete(b.batchUuid);
      const e = runs.get(runUuid);
      if (!e) return;
      for (const p of e.points) p.synced = false;
      e.run.serverRunId = null;
      e.run.syncState = 'PENDING';
    },
  };
}
