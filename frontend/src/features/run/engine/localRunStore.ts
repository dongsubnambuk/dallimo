import type { RunMode, RunPoint } from '@/entities/run/types';

// 11장 로컬 저장. 진행 중 러닝의 진실의 원천(9.3장). 앱이 꺼졌다 켜지면 여기서 이어서 복구한다.
// 49.1장 RunPointStore의 getUnsyncedRange · markSynced를 포함하고, append는 여러 point를 한 트랜잭션으로 넣는다(50.1장).
export type LocalRunStatus = 'RUNNING' | 'PAUSED' | 'FINISHED' | 'CANCELED';

export type LocalRun = {
  clientRunUuid: string;
  mode: RunMode;
  courseId: string | null;
  status: LocalRunStatus;
  startedAt: number;
  endedAt: number | null;
  // 마지막 일시정지 · 종료까지의 active 경과(ms)
  elapsedMs: number;
  lastSeq: number;
  // 이어 달릴 때 화면에 보여줄 계획 (RunPlanParams JSON)
  plan: string | null;
  // 서버 Run id (POST /runs 뒤). 아직 만들지 않았으면 null
  serverRunId: string | null;
  // 서버까지 끝냈는지 (29.4장 Sync Worker). PENDING → SYNCED, 올릴 수 없는 오류면 FAILED
  syncState: LocalRunSyncState;
  // 인터벌 달리기: 끝난 구간의 경계 (StepBoundary[] JSON). 이어 달리기 · 서버 구간 결과에 쓴다
  workoutProgress: string | null;
};

export type LocalRunSyncState = 'PENDING' | 'SYNCED' | 'FAILED';

export type HeartRateSample = { recordedAt: number; bpm: number };

// 50.3장 Batch 상태
export type SyncBatchStatus = 'PENDING' | 'SENDING' | 'ACKED' | 'RETRY_WAIT' | 'FAILED';
export type SyncBatch = {
  batchUuid: string;
  clientRunUuid: string;
  fromSeq: number;
  toSeq: number;
  status: SyncBatchStatus;
  retryCount: number;
  nextRetryAt: number | null;
};

// 달린 구간. 시작 · 재개부터 일시정지 · 종료까지. endedAt이 null이면 지금 달리는 중인 구간.
export type RunSegment = { startedAt: number; endedAt: number | null };

// seq는 저장소가 붙인다
export type NewRunPoint = Omit<RunPoint, 'seq'>;

// 개발용 GPS PoC 화면에서 보는 러닝별 수집 통계 (18장 GPS 지표: 평균 accuracy, rejected point 비율)
export type LocalRunStats = LocalRun & {
  pointCount: number;
  lowAccuracyCount: number;
  jumpCount: number;
  avgAccuracyM: number | null;
  firstPointAt: number | null;
  lastPointAt: number | null;
};

export interface LocalRunStore {
  createRun(run: { clientRunUuid: string; mode: RunMode; courseId: string | null; plan: string | null; startedAt: number }): Promise<void>;
  // 앱이 꺼지기 전 RUNNING · PAUSED로 남은 러닝 (11.3장)
  findOpenRun(): Promise<LocalRun | null>;
  getRun(runUuid: string): Promise<LocalRun | null>;
  pauseRun(runUuid: string, at: number): Promise<void>;
  resumeRun(runUuid: string, at: number): Promise<void>;
  endRun(runUuid: string, at: number, status: 'FINISHED' | 'CANCELED'): Promise<void>;
  // 인터벌 달리기: 구간이 끝날 때마다 경계를 저장한다
  setWorkoutProgress(runUuid: string, json: string): Promise<void>;
  // 워치 심박 (심박 저장에 동의했을 때만, 결정 로그 65항). 같은 시각은 한 번만
  appendHeartRate(runUuid: string, recordedAt: number, bpm: number): Promise<void>;
  getHeartRates(runUuid: string): Promise<HeartRateSample[]>;
  // 심박 저장 동의를 끄면 아직 올리지 않은 심박도 지운다
  clearHeartRates(): Promise<void>;
  // 50.1장: seq > last_seq 확인 → INSERT → last_seq 갱신을 한 트랜잭션으로. 붙인 seq를 담아 돌려준다.
  appendPoints(runUuid: string, points: NewRunPoint[]): Promise<RunPoint[]>;
  getPoints(runUuid: string): Promise<RunPoint[]>;
  getSegments(runUuid: string): Promise<RunSegment[]>;
  getUnsyncedRange(runUuid: string, limit: number): Promise<RunPoint[]>;
  markSynced(runUuid: string, fromSeq: number, toSeq: number): Promise<void>;
  countUnsynced(runUuid: string): Promise<number>;
  listRuns(limit: number): Promise<LocalRunStats[]>;
  deleteRun(runUuid: string): Promise<void>;

  // ── 29.4 · 50장 동기화 ──
  setServerRunId(runUuid: string, serverRunId: string): Promise<void>;
  setRunSyncState(runUuid: string, state: LocalRunSyncState): Promise<void>;
  // 서버까지 끝내지 못한 러닝 (진행 중 포함)
  listUnsyncedRuns(): Promise<LocalRun[]>;
  // 50.2장: 아직 어느 Batch에도 들어가지 않은 point 중 앞에서부터 이어지는 seq 범위. 없으면 null
  nextBatchRange(runUuid: string, limit: number): Promise<{ fromSeq: number; toSeq: number } | null>;
  // 50.2장: Batch UUID를 먼저 기록한 뒤 보낸다
  createBatch(batch: { batchUuid: string; clientRunUuid: string; fromSeq: number; toSeq: number }): Promise<void>;
  // ACKED · FAILED가 아닌 Batch (seq 순)
  getOpenBatches(runUuid: string): Promise<SyncBatch[]>;
  hasFailedBatch(runUuid: string): Promise<boolean>;
  updateBatch(batchUuid: string, patch: { status: SyncBatchStatus; retryCount?: number; nextRetryAt?: number | null }): Promise<void>;
  // 서버가 받았다: Batch ACKED + 그 범위 point SYNCED를 한 번에
  ackBatch(batchUuid: string): Promise<void>;
  getPointRange(runUuid: string, fromSeq: number, toSeq: number): Promise<RunPoint[]>;
  // 50.3장: 앱이 꺼질 때 SENDING이던 Batch는 다시 켜질 때 RETRY_WAIT로 (같은 batchUuid로 다시 보낸다)
  resetSendingBatches(): Promise<void>;
  // 서버가 이 Run을 모른다고 할 때: 서버 id · Batch를 지우고 point를 다시 PENDING으로 (처음부터 다시 올림)
  resetSync(runUuid: string): Promise<void>;
}

/** 구간 목록으로 at 시점까지의 active 경과(ms). 일시정지 시간은 빠진다. */
export function activeMsAt(segments: RunSegment[], at: number): number {
  let ms = 0;
  for (const s of segments) {
    if (s.startedAt >= at) break;
    ms += Math.min(s.endedAt ?? at, at) - s.startedAt;
  }
  return Math.max(0, ms);
}
