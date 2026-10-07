import type { RunMode, RunPoint, RunSplit, RunStatus } from '@/entities/run/types';
import type { FlatStep, StepBoundary } from '@/entities/workout/types';
import type { GeoPoint } from '@/shared/geo';
import type { GpsQuality } from '@/shared/location/locationSource';

// 명세서 49.1장 Run Engine interface. UI는 expo-location·SQLite를 직접 부르지 않고 이 경계만 쓴다.
// 실제 구현은 deviceRunningEngine(GPS 수신, SQLite 선저장, 백그라운드 기록, 복구). 서버 업로드는 features/run/sync가 한다.

export type RunPrepareInput = {
  mode: RunMode;
  // 코스 러닝(COURSE / PB / CHALLENGE)이면 기준 코스 경로
  course?: { id: string; route: GeoPoint[] };
  targetSec?: number;
  // 인터벌 달리기(INTERVAL): 반복을 푼 구간 순서. 엔진이 거리 · 시간으로 구간을 넘긴다
  workout?: FlatStep[];
  // 앱이 꺼졌다 켜져 이어 달릴 때 화면에 다시 보여줄 계획 (RunPlanParams JSON)
  plan?: string;
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
  // RUN-009: 멈춰 서서 자동으로 일시정지한 상태면 true. 다시 달리면 이어서 기록한다
  autoPaused: boolean;
  // 인터벌 달리기: 끝난 구간의 경계 (구간이 끝날 때만 바뀐다). 인터벌이 아니면 null
  interval: { boundaries: StepBoundary[] } | null;
};

export type RunFinishResult = {
  // 42.1장 clientRunUuid: POST /runs 멱등 키이자 기기 저장(local_run) 키
  clientRunUuid: string;
  mode: RunMode;
  // 시작 시각(epoch ms). API로는 ISO-8601로 보낸다 (7.4장)
  startedAt: number;
  distanceM: number;
  activeSec: number;
  avgPaceSec: number | null;
  splits: RunSplit[];
  // 평균 페이스는 sec/km 정수 (7.4장)
  // 서버 동기화 전이면 false (local-only 결과)
  synced: boolean;
  // 코스 러닝: 코스 끝에 닿은 시점까지 걸린 시간(초). 완주하지 못했으면 null.
  courseTimeSec: number | null;
  // 결과 지도용 실제 경로 (줄인 것)
  path: GeoPoint[];
  // 인터벌 달리기: 구간 경계 (끝낼 때 하던 구간까지). 인터벌이 아니면 null
  intervalBoundaries: StepBoundary[] | null;
};

export interface RunningEngine {
  prepare(input: RunPrepareInput): Promise<void>;
  start(): Promise<ActiveRunSnapshot>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<RunFinishResult>;
  // 기록을 남기지 않고 끝낸다 (잘못 시작했거나 너무 짧은 러닝, 결정 로그 82항). 기기 기록은 CANCELED로 남고 서버에 올리지 않는다
  discard(): Promise<void>;
  recover(): Promise<ActiveRunSnapshot | null>;
  // 인터벌 달리기: 직접 넘기는 구간을 지금 끝내고 다음 구간으로
  nextIntervalStep(): void;
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
  getUnsyncedRange(runUuid: string, limit: number): Promise<RunPoint[]>;
  markSynced(runUuid: string, fromSeq: number, toSeq: number): Promise<void>;
  unsyncedCount(): number;
}

export function activeMs(s: Pick<ActiveRunSnapshot, 'activeMsBase' | 'runningSince'>, now: number): number {
  return s.activeMsBase + (s.runningSince != null ? Math.max(0, now - s.runningSince) : 0);
}
