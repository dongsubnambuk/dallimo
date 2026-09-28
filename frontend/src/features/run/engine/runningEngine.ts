import type { RunMode, RunPoint, RunSplit, RunStatus } from '@/entities/run/types';
import type { GeoPoint } from '@/shared/geo';
import type { GpsQuality } from '@/shared/location/locationSource';

// 명세서 49.1장 Run Engine interface. UI는 expo-location·SQLite를 직접 부르지 않고 이 경계만 쓴다.
// 실제 구현(GPS 수신, SQLite 선저장, Batch Sync, 백그라운드 기록)은 GPS PoC(WBS 1) 단계에서 같은 인터페이스로 만든다.

export type RunPrepareInput = {
  mode: RunMode;
  // 코스 러닝(COURSE / PB / CHALLENGE)이면 기준 코스 경로
  course?: { id: string; route: GeoPoint[] };
  targetSec?: number;
};

// CRUN-001~003 코스 러닝 상태. FREE면 null.
export type CourseRunState = {
  lengthM: number;
  progressM: number;
  // 지속 이탈 중이면 코스 선까지 거리(m), 아니면 null
  offRouteM: number | null;
  // 코스 끝에 닿은 시점의 active 경과(ms). 아직이면 null.
  completedActiveMs: number | null;
};

// 화면이 구독하는 러닝 상태. 초 단위로 바뀌는 경과 시간은 넣지 않고 기준값만 둔다 (VISUAL-QA: metric state 분리).
export type ActiveRunSnapshot = {
  status: RunStatus;
  mode: RunMode;
  gps: GpsQuality;
  network: 'online' | 'offline';
  // 아직 서버에 올리지 못한 point 수 (RUN-006 Local First, RUN-007 Batch Sync)
  unsyncedPoints: number;
  distanceM: number;
  avgPaceSec: number | null;
  currentPaceSec: number | null;
  splits: RunSplit[];
  // 지도 표시용으로 줄인 실제 경로 (77장: 원본 point 전체를 그리지 않는다)
  path: GeoPoint[];
  position: GeoPoint | null;
  // active 경과(ms) = activeMsBase + (runningSince != null ? now() - runningSince : 0)
  activeMsBase: number;
  runningSince: number | null;
  // 앱이 꺼졌다 켜져 이어서 기록 중이면 true (RECOVERY를 거친 러닝)
  recovered: boolean;
  course: CourseRunState | null;
};

export type RunFinishResult = {
  mode: RunMode;
  distanceM: number;
  activeSec: number;
  avgPaceSec: number | null;
  splits: RunSplit[];
  // 서버 동기화 전이면 false (local-only 결과)
  synced: boolean;
  // 코스 러닝: 코스 끝에 닿은 시점까지 걸린 시간(초). 완주하지 못했으면 null.
  courseTimeSec: number | null;
};

export interface RunningEngine {
  prepare(input: RunPrepareInput): Promise<void>;
  start(): Promise<ActiveRunSnapshot>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<RunFinishResult>;
  recover(): Promise<ActiveRunSnapshot | null>;
  // 화면 구독용 (useSyncExternalStore)
  subscribe(listener: () => void): () => void;
  getSnapshot(): ActiveRunSnapshot;
  // 엔진 기준 현재 시각(ms). 경과 시간 계산에 쓴다.
  now(): number;
  dispose(): void;
}

// 49.1장 RunPointStore. 실제 구현은 SQLite(11.1장 local_run_point).
export interface RunPointStore {
  append(point: RunPoint): Promise<void>;
  getUnsyncedRange(limit: number): Promise<RunPoint[]>;
  markSynced(fromSeq: number, toSeq: number): Promise<void>;
  unsyncedCount(): number;
}

export function activeMs(s: Pick<ActiveRunSnapshot, 'activeMsBase' | 'runningSince'>, now: number): number {
  return s.activeMsBase + (s.runningSince != null ? Math.max(0, now - s.runningSince) : 0);
}
