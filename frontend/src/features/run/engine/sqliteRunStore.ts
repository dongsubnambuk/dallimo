import type { RunMode, RunPoint, RunPointQuality } from '@/entities/run/types';
import type { SqlDb } from '@/shared/db/schema';

import type { LocalRun, LocalRunStatus, LocalRunStore, LocalRunSyncState, RunSegment, SyncBatch, SyncBatchStatus } from './localRunStore';

// 11 · 29 · 50장 SQLite 저장소. 쓰기는 한 줄로 세워 트랜잭션이 겹치지 않게 한다.
// (expo-sqlite withTransactionAsync는 같은 연결의 다른 쿼리가 끼어들 수 있다)
type RunRow = {
  client_run_uuid: string;
  mode: string;
  course_id: string | null;
  status: string;
  started_at: number;
  ended_at: number | null;
  elapsed_ms: number;
  last_seq: number;
  plan: string | null;
  server_run_id: string | number | null;
  sync_state: string;
  workout_progress: string | null;
};

type BatchRow = {
  batch_uuid: string;
  client_run_uuid: string;
  from_seq: number;
  to_seq: number;
  status: string;
  retry_count: number;
  next_retry_at: number | null;
};

const toBatch = (r: BatchRow): SyncBatch => ({
  batchUuid: r.batch_uuid,
  clientRunUuid: r.client_run_uuid,
  fromSeq: r.from_seq,
  toSeq: r.to_seq,
  status: r.status as SyncBatchStatus,
  retryCount: r.retry_count,
  nextRetryAt: r.next_retry_at,
});
const BATCH_COLUMNS = 'batch_uuid, client_run_uuid, from_seq, to_seq, status, retry_count, next_retry_at';

type PointRow = {
  seq: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  recorded_at: number;
  quality_flag: string;
};

const toRun = (r: RunRow): LocalRun => ({
  clientRunUuid: r.client_run_uuid,
  mode: r.mode as RunMode,
  courseId: r.course_id,
  status: r.status as LocalRunStatus,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  elapsedMs: r.elapsed_ms,
  lastSeq: r.last_seq,
  plan: r.plan,
  serverRunId: r.server_run_id != null ? String(r.server_run_id) : null,
  syncState: r.sync_state as LocalRunSyncState,
  workoutProgress: r.workout_progress,
});

const toPoint = (r: PointRow): RunPoint => ({
  seq: r.seq,
  latitude: r.latitude,
  longitude: r.longitude,
  ...(r.altitude != null ? { altitude: r.altitude } : {}),
  accuracy: r.accuracy ?? Number.NaN,
  ...(r.speed != null ? { speed: r.speed } : {}),
  recordedAt: r.recorded_at,
  qualityFlag: r.quality_flag as RunPointQuality,
});

const RUN_COLUMNS = 'client_run_uuid, mode, course_id, status, started_at, ended_at, elapsed_ms, last_seq, plan, server_run_id, sync_state, workout_progress';
const POINT_COLUMNS = 'seq, latitude, longitude, altitude, accuracy, speed, recorded_at, quality_flag';

export function createSqliteRunStore(db: SqlDb): LocalRunStore {
  let queue: Promise<unknown> = Promise.resolve();
  const write = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };
  const tx = <T>(task: () => Promise<T>): Promise<T> =>
    write(async () => {
      let out: T | undefined;
      await db.withTransactionAsync(async () => {
        out = await task();
      });
      return out as T;
    });

  const segments = (runUuid: string) =>
    db
      .getAllAsync<{ started_at: number; ended_at: number | null }>(
        'SELECT started_at, ended_at FROM local_run_segment WHERE client_run_uuid = ? ORDER BY started_at',
        runUuid,
      )
      .then((rows): RunSegment[] => rows.map((r) => ({ startedAt: r.started_at, endedAt: r.ended_at })));

  // 열린 구간을 at에 닫고 elapsed_ms를 다시 계산한다
  const closeSegment = async (runUuid: string, at: number) => {
    await db.runAsync('UPDATE local_run_segment SET ended_at = MAX(started_at, ?) WHERE client_run_uuid = ? AND ended_at IS NULL', at, runUuid);
    await db.runAsync(
      `UPDATE local_run SET elapsed_ms = (
         SELECT COALESCE(SUM(ended_at - started_at), 0) FROM local_run_segment WHERE client_run_uuid = ? AND ended_at IS NOT NULL
       ) WHERE client_run_uuid = ?`,
      runUuid,
      runUuid,
    );
  };

  return {
    createRun: ({ clientRunUuid, mode, courseId, plan, startedAt }) =>
      tx(async () => {
        await db.runAsync(
          `INSERT INTO local_run (client_run_uuid, mode, course_id, status, started_at, elapsed_ms, last_seq, sync_state, plan)
           VALUES (?, ?, ?, 'RUNNING', ?, 0, 0, 'PENDING', ?)`,
          clientRunUuid,
          mode,
          courseId,
          startedAt,
          plan,
        );
        await db.runAsync('INSERT INTO local_run_segment (client_run_uuid, started_at) VALUES (?, ?)', clientRunUuid, startedAt);
      }),

    async findOpenRun() {
      const row = await db.getFirstAsync<RunRow>(
        `SELECT ${RUN_COLUMNS} FROM local_run WHERE status IN ('RUNNING', 'PAUSED') ORDER BY started_at DESC LIMIT 1`,
      );
      return row ? toRun(row) : null;
    },

    async getRun(runUuid) {
      const row = await db.getFirstAsync<RunRow>(`SELECT ${RUN_COLUMNS} FROM local_run WHERE client_run_uuid = ?`, runUuid);
      return row ? toRun(row) : null;
    },

    setWorkoutProgress: (runUuid, json) =>
      write(async () => {
        await db.runAsync('UPDATE local_run SET workout_progress = ? WHERE client_run_uuid = ?', json, runUuid);
      }),

    pauseRun: (runUuid, at) =>
      tx(async () => {
        await closeSegment(runUuid, at);
        await db.runAsync("UPDATE local_run SET status = 'PAUSED' WHERE client_run_uuid = ? AND status = 'RUNNING'", runUuid);
      }),

    resumeRun: (runUuid, at) =>
      tx(async () => {
        // 이미 열린 구간이 있으면(중복 호출) 새로 열지 않는다
        const open = await db.getFirstAsync<{ n: number }>(
          'SELECT COUNT(*) AS n FROM local_run_segment WHERE client_run_uuid = ? AND ended_at IS NULL',
          runUuid,
        );
        if (!open?.n) await db.runAsync('INSERT OR IGNORE INTO local_run_segment (client_run_uuid, started_at) VALUES (?, ?)', runUuid, at);
        await db.runAsync("UPDATE local_run SET status = 'RUNNING' WHERE client_run_uuid = ? AND status IN ('RUNNING', 'PAUSED')", runUuid);
      }),

    endRun: (runUuid, at, status) =>
      tx(async () => {
        await closeSegment(runUuid, at);
        await db.runAsync('UPDATE local_run SET status = ?, ended_at = ? WHERE client_run_uuid = ?', status, at, runUuid);
      }),

    appendPoints: (runUuid, points) =>
      tx(async () => {
        const run = await db.getFirstAsync<{ last_seq: number }>('SELECT last_seq FROM local_run WHERE client_run_uuid = ?', runUuid);
        if (!run || points.length === 0) return [];
        let seq = run.last_seq;
        const saved: RunPoint[] = [];
        for (const p of points) {
          seq += 1;
          await db.runAsync(
            `INSERT INTO local_run_point (client_run_uuid, seq, latitude, longitude, altitude, accuracy, speed, recorded_at, quality_flag, sync_state)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            runUuid,
            seq,
            p.latitude,
            p.longitude,
            p.altitude ?? null,
            Number.isFinite(p.accuracy) ? p.accuracy : null,
            p.speed ?? null,
            p.recordedAt,
            p.qualityFlag,
          );
          saved.push({ ...p, seq });
        }
        await db.runAsync('UPDATE local_run SET last_seq = ? WHERE client_run_uuid = ? AND last_seq < ?', seq, runUuid, seq);
        return saved;
      }),

    async getPoints(runUuid) {
      const rows = await db.getAllAsync<PointRow>(`SELECT ${POINT_COLUMNS} FROM local_run_point WHERE client_run_uuid = ? ORDER BY seq`, runUuid);
      return rows.map(toPoint);
    },

    getSegments: segments,

    async getUnsyncedRange(runUuid, limit) {
      const rows = await db.getAllAsync<PointRow>(
        `SELECT ${POINT_COLUMNS} FROM local_run_point WHERE client_run_uuid = ? AND sync_state = 'PENDING' ORDER BY seq LIMIT ?`,
        runUuid,
        limit,
      );
      return rows.map(toPoint);
    },

    markSynced: (runUuid, fromSeq, toSeq) =>
      write(() =>
        db.runAsync(
          "UPDATE local_run_point SET sync_state = 'SYNCED' WHERE client_run_uuid = ? AND seq BETWEEN ? AND ?",
          runUuid,
          fromSeq,
          toSeq,
        ),
      ).then(() => undefined),

    async countUnsynced(runUuid) {
      const row = await db.getFirstAsync<{ n: number }>(
        "SELECT COUNT(*) AS n FROM local_run_point WHERE client_run_uuid = ? AND sync_state = 'PENDING'",
        runUuid,
      );
      return row?.n ?? 0;
    },

    async listRuns(limit) {
      const rows = await db.getAllAsync<
        RunRow & { point_count: number; low_count: number; jump_count: number; avg_accuracy: number | null; first_at: number | null; last_at: number | null }
      >(
        `SELECT ${RUN_COLUMNS.split(', ')
          .map((c) => `r.${c}`)
          .join(', ')},
           COUNT(p.seq) AS point_count,
           COALESCE(SUM(p.quality_flag = 'LOW_ACCURACY'), 0) AS low_count,
           COALESCE(SUM(p.quality_flag = 'JUMP'), 0) AS jump_count,
           AVG(p.accuracy) AS avg_accuracy,
           MIN(p.recorded_at) AS first_at,
           MAX(p.recorded_at) AS last_at
         FROM local_run r LEFT JOIN local_run_point p ON p.client_run_uuid = r.client_run_uuid
         GROUP BY r.client_run_uuid
         ORDER BY r.started_at DESC
         LIMIT ?`,
        limit,
      );
      return rows.map((r) => ({
        ...toRun(r),
        pointCount: r.point_count,
        lowAccuracyCount: r.low_count,
        jumpCount: r.jump_count,
        avgAccuracyM: r.avg_accuracy,
        firstPointAt: r.first_at,
        lastPointAt: r.last_at,
      }));
    },

    deleteRun: (runUuid) =>
      tx(async () => {
        await db.runAsync('DELETE FROM local_run_point WHERE client_run_uuid = ?', runUuid);
        await db.runAsync('DELETE FROM local_run_segment WHERE client_run_uuid = ?', runUuid);
        await db.runAsync('DELETE FROM local_sync_batch WHERE client_run_uuid = ?', runUuid);
        await db.runAsync('DELETE FROM local_run WHERE client_run_uuid = ?', runUuid);
      }),

    setServerRunId: (runUuid, serverRunId) =>
      write(() => db.runAsync('UPDATE local_run SET server_run_id = ? WHERE client_run_uuid = ?', serverRunId, runUuid)).then(() => undefined),

    setRunSyncState: (runUuid, state) =>
      write(() => db.runAsync('UPDATE local_run SET sync_state = ? WHERE client_run_uuid = ?', state, runUuid)).then(() => undefined),

    async listUnsyncedRuns() {
      const rows = await db.getAllAsync<RunRow>(`SELECT ${RUN_COLUMNS} FROM local_run WHERE sync_state = 'PENDING' ORDER BY started_at`);
      return rows.map(toRun);
    },

    async nextBatchRange(runUuid, limit) {
      const after = await db.getFirstAsync<{ s: number | null }>('SELECT MAX(to_seq) AS s FROM local_sync_batch WHERE client_run_uuid = ?', runUuid);
      const rows = await db.getAllAsync<{ seq: number }>(
        "SELECT seq FROM local_run_point WHERE client_run_uuid = ? AND sync_state = 'PENDING' AND seq > ? ORDER BY seq LIMIT ?",
        runUuid,
        after?.s ?? 0,
        limit,
      );
      if (!rows.length) return null;
      // 이어지는 seq까지만 한 Batch로 (gap이 있으면 다음 Batch)
      let toSeq = rows[0].seq;
      for (const r of rows.slice(1)) {
        if (r.seq !== toSeq + 1) break;
        toSeq = r.seq;
      }
      return { fromSeq: rows[0].seq, toSeq };
    },

    createBatch: ({ batchUuid, clientRunUuid, fromSeq, toSeq }) =>
      write(() =>
        db.runAsync(
          "INSERT INTO local_sync_batch (batch_uuid, client_run_uuid, from_seq, to_seq, status, retry_count) VALUES (?, ?, ?, ?, 'PENDING', 0)",
          batchUuid,
          clientRunUuid,
          fromSeq,
          toSeq,
        ),
      ).then(() => undefined),

    async getOpenBatches(runUuid) {
      const rows = await db.getAllAsync<BatchRow>(
        `SELECT ${BATCH_COLUMNS} FROM local_sync_batch WHERE client_run_uuid = ? AND status NOT IN ('ACKED', 'FAILED') ORDER BY from_seq`,
        runUuid,
      );
      return rows.map(toBatch);
    },

    async hasFailedBatch(runUuid) {
      const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM local_sync_batch WHERE client_run_uuid = ? AND status = 'FAILED'", runUuid);
      return (row?.n ?? 0) > 0;
    },

    updateBatch: (batchUuid, { status, retryCount, nextRetryAt }) =>
      write(() =>
        db.runAsync(
          `UPDATE local_sync_batch SET status = ?,
             retry_count = COALESCE(?, retry_count),
             next_retry_at = CASE WHEN ? THEN ? ELSE next_retry_at END
           WHERE batch_uuid = ?`,
          status,
          retryCount ?? null,
          nextRetryAt !== undefined ? 1 : 0,
          nextRetryAt ?? null,
          batchUuid,
        ),
      ).then(() => undefined),

    ackBatch: (batchUuid) =>
      tx(async () => {
        const b = await db.getFirstAsync<BatchRow>(`SELECT ${BATCH_COLUMNS} FROM local_sync_batch WHERE batch_uuid = ?`, batchUuid);
        if (!b) return;
        await db.runAsync("UPDATE local_sync_batch SET status = 'ACKED', next_retry_at = NULL WHERE batch_uuid = ?", batchUuid);
        await db.runAsync(
          "UPDATE local_run_point SET sync_state = 'SYNCED' WHERE client_run_uuid = ? AND seq BETWEEN ? AND ?",
          b.client_run_uuid,
          b.from_seq,
          b.to_seq,
        );
      }),

    async getPointRange(runUuid, fromSeq, toSeq) {
      const rows = await db.getAllAsync<PointRow>(
        `SELECT ${POINT_COLUMNS} FROM local_run_point WHERE client_run_uuid = ? AND seq BETWEEN ? AND ? ORDER BY seq`,
        runUuid,
        fromSeq,
        toSeq,
      );
      return rows.map(toPoint);
    },

    resetSendingBatches: () =>
      write(() => db.runAsync("UPDATE local_sync_batch SET status = 'RETRY_WAIT', next_retry_at = NULL WHERE status = 'SENDING'")).then(() => undefined),

    resetSync: (runUuid) =>
      tx(async () => {
        await db.runAsync('DELETE FROM local_sync_batch WHERE client_run_uuid = ?', runUuid);
        await db.runAsync("UPDATE local_run_point SET sync_state = 'PENDING' WHERE client_run_uuid = ?", runUuid);
        await db.runAsync("UPDATE local_run SET server_run_id = NULL, sync_state = 'PENDING' WHERE client_run_uuid = ?", runUuid);
      }),
  };
}
