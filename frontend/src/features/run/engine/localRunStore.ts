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
  // 50.1장: seq > last_seq 확인 → INSERT → last_seq 갱신을 한 트랜잭션으로. 붙인 seq를 담아 돌려준다.
  appendPoints(runUuid: string, points: NewRunPoint[]): Promise<RunPoint[]>;
  getPoints(runUuid: string): Promise<RunPoint[]>;
  getSegments(runUuid: string): Promise<RunSegment[]>;
  getUnsyncedRange(runUuid: string, limit: number): Promise<RunPoint[]>;
  markSynced(runUuid: string, fromSeq: number, toSeq: number): Promise<void>;
  countUnsynced(runUuid: string): Promise<number>;
  listRuns(limit: number): Promise<LocalRunStats[]>;
  deleteRun(runUuid: string): Promise<void>;
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
