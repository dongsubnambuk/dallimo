import type { RunPoint } from '@/entities/run/types';

import type { LocalRun, LocalRunStats, LocalRunStore, RunSegment } from './localRunStore';

// 웹(개발 확인용)에서 쓰는 메모리 저장소. SQLite 저장소와 같은 동작을 하지만 새로고침하면 사라진다.
type Entry = { run: LocalRun; points: (RunPoint & { synced: boolean })[]; segments: RunSegment[] };

export function createMemoryLocalRunStore(): LocalRunStore {
  const runs = new Map<string, Entry>();

  const closeSegment = (e: Entry, at: number) => {
    for (const s of e.segments) if (s.endedAt == null) s.endedAt = Math.max(s.startedAt, at);
    e.run.elapsedMs = e.segments.reduce((a, s) => a + (s.endedAt != null ? s.endedAt - s.startedAt : 0), 0);
  };
  const strip = ({ synced: _synced, ...p }: RunPoint & { synced: boolean }): RunPoint => p;

  return {
    async createRun({ clientRunUuid, mode, courseId, plan, startedAt }) {
      if (runs.has(clientRunUuid)) throw new Error('run already exists');
      runs.set(clientRunUuid, {
        run: { clientRunUuid, mode, courseId, status: 'RUNNING', startedAt, endedAt: null, elapsedMs: 0, lastSeq: 0, plan },
        points: [],
        segments: [{ startedAt, endedAt: null }],
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
    },
  };
}
