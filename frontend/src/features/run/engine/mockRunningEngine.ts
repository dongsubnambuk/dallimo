import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';
import { advanceCourse, createCourseTrack, initialCourseProgress, type CourseProgressState, type CourseTrack } from '@/entities/run/courseProgress';
import { addPoint, averagePace, breakSegment, currentPace, initialMetrics, type MetricsState } from '@/entities/run/metrics';
import { autoPauseAvailable, initialAutoPause, stepAutoPause, type AutoPauseState } from '@/entities/run/autoPause';
import { getRunPolicySync } from '@/entities/run/policy';
import type { RunMode, RunPoint } from '@/entities/run/types';
import { distanceM, pointAt, type GeoPoint } from '@/shared/geo';
import { getPreferences } from '@/shared/preferences';
import { createUuid } from '@/shared/uuid';

import { createIntervalTracking, type IntervalTracking } from './intervalTracking';
import { createMemoryRunPointStore } from './memoryRunPointStore';
import { activeMs, type ActiveRunSnapshot, type RunFinishResult, type RunningEngine, type RunPrepareInput } from './runningEngine';

// 개발 빌드에서 Active Run 상태를 만들어 QA하기 위한 값 (SCREEN-SPECS: running, paused, GPS poor, offline, recovering, finish pending).
// 코스 러닝: offRoute(코스를 벗어났다 돌아옴), behind(목표보다 느리게 달림).
// stopAndGo: 신호등에서 멈췄다 다시 달림 (RUN-009 자동 일시정지 QA. 설정에서 자동 일시정지를 켜야 멈춘다)
export const ACTIVE_RUN_SCENARIOS = ['normal', 'poorGps', 'offline', 'recovering', 'finishPending', 'offRoute', 'behind', 'stopAndGo'] as const;
export type ActiveRunScenario = (typeof ACTIVE_RUN_SCENARIOS)[number];

export function parseActiveRunScenario(value: unknown): ActiveRunScenario {
  if (!__DEV__) return 'normal';
  return (ACTIVE_RUN_SCENARIOS as readonly unknown[]).includes(value) ? (value as ActiveRunScenario) : 'normal';
}

type MockOptions = {
  scenario: ActiveRunScenario;
  // 개발용 시간 배속. 1이면 실제 시간.
  speed: number;
};

// 가짜 러너: 5'15"/km 안팎으로 달린다. FREE면 수성못 호안을 계속 돌고, 코스 러닝이면 코스 출발점부터 코스를 따라간다.
const LOOP: GeoPoint[] = MOCK_COURSE_ROUTES['c-suseongmot'].route.map(([latitude, longitude]) => ({ latitude, longitude }));
const LOOP_M = LOOP.slice(1).reduce((a, p, i) => a + distanceM(LOOP[i], p), 0);
const BASE_MPS = 1000 / 315;
// GPS 약함 구간(엔진 시각 기준 출발 후 초)
const POOR_FROM_SEC = 20;
const POOR_TO_SEC = 45;
// 코스 이탈 구간(출발 후 초)과 벗어나는 거리(m)
const OFF_FROM_SEC = 30;
const OFF_TO_SEC = 70;
const OFF_M = 90;
// stopAndGo: 멈춰 서 있는 구간(출발 후 초, 엔진 시각)
const STOP_FROM_SEC = 20;
const STOP_TO_SEC = 45;
// Batch Sync 간격(초). 명세에 값이 없어 mock에서만 쓴다.
const SYNC_EVERY_SEC = 5;
const PATH_EVERY = 5;

// 진행 방향의 오른쪽 수직으로 m만큼 옮긴 점 (코스를 벗어나는 흉내)
function sideStep(p: GeoPoint, ahead: GeoPoint, m: number): GeoPoint {
  const k = Math.cos((p.latitude * Math.PI) / 180);
  const dx = (ahead.longitude - p.longitude) * k;
  const dy = ahead.latitude - p.latitude;
  const len = Math.hypot(dx, dy) || 1;
  const deg = m / 111_320;
  return { latitude: p.latitude - (dx / len) * deg, longitude: p.longitude + ((dy / len) * deg) / k };
}

// 7.4장: 페이스는 sec/km 정수
const roundPace = (p: number | null) => (p == null ? null : Math.round(p));

export function createMockRunningEngine({ scenario, speed }: MockOptions): RunningEngine {
  const policy = getRunPolicySync();
  const store = createMemoryRunPointStore();
  const listeners = new Set<() => void>();
  const real0 = Date.now();
  const now = () => real0 + (Date.now() - real0) * speed;
  // 엔진 시계(개발용 배속 포함)를 실제 시각으로 바꾼다
  const realTime = (t: number) => Math.round(real0 + (t - real0) / speed);

  let mode: RunMode = 'FREE';
  let metrics: MetricsState = initialMetrics();
  let travelledM = 0;
  let seq = 0;
  let startedAt = 0;
  // 42.1장 clientRunUuid. 실제 엔진은 start 때 POST /runs에 이 값을 보낸다
  const runUuid = createUuid();
  let lastTickAt = 0;
  let lastSyncAt = 0;
  let acceptedCount = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let path: GeoPoint[] = LOOP;
  let pathM = LOOP_M;
  let loopPath = true;
  let track: CourseTrack | null = null;
  let courseState: CourseProgressState = initialCourseProgress();
  const pace = scenario === 'behind' ? 0.9 : 1;
  let autoPause = false;
  let autoPauseState: AutoPauseState = initialAutoPause();
  let interval: IntervalTracking = createIntervalTracking(null, () => undefined);
  let snap: ActiveRunSnapshot = {
    status: 'PREPARING',
    mode,
    gps: 'acquiring',
    network: scenario === 'offline' ? 'offline' : 'online',
    unsyncedPoints: 0,
    distanceM: 0,
    avgPaceSec: null,
    currentPaceSec: null,
    splits: [],
    path: [],
    position: null,
    activeMsBase: 0,
    runningSince: null,
    recovered: false,
    course: null,
    autoPaused: false,
    interval: null,
  };

  const emit = (patch: Partial<ActiveRunSnapshot>) => {
    snap = { ...snap, ...patch };
    listeners.forEach((l) => l());
  };

  const positionAt = (m: number): GeoPoint => {
    // 순환이 아닌 코스는 끝에서 되돌아온다 (mock)
    const r = m % (loopPath ? pathM : pathM * 2);
    const p = pointAt(path, (r <= pathM ? r : pathM * 2 - r) / pathM);
    // 몇 m 안쪽의 흔들림 (난수 대신 sin, 같은 입력이면 같은 결과)
    const j = 0.000015;
    return { latitude: p.latitude + Math.sin(m / 37) * j, longitude: p.longitude + Math.cos(m / 53) * j };
  };

  // stopAndGo 구간이면 멈춰 있다
  const stoppedAt = (t: number) => scenario === 'stopAndGo' && (t - startedAt) / 1000 >= STOP_FROM_SEC && (t - startedAt) / 1000 < STOP_TO_SEC;

  // 자동 일시정지 중에는 기록하지 않고 움직이는지만 본다
  const watchWhilePaused = (t: number): boolean => {
    while (lastTickAt + 1000 <= t) {
      lastTickAt += 1000;
      const v = stoppedAt(lastTickAt) ? 0 : BASE_MPS * pace;
      travelledM += v;
      const pos = positionAt(travelledM);
      const out = stepAutoPause(autoPauseState, { ...pos, speed: v, accuracy: 5, timestamp: lastTickAt }, true, policy);
      autoPauseState = out.state;
      if (out.action?.kind === 'resume') {
        resumeAt(lastTickAt);
        return true;
      }
    }
    return false;
  };

  const resumeAt = (t: number) => {
    lastTickAt = t;
    autoPauseState = initialAutoPause();
    emit({ status: 'RUNNING', autoPaused: false, runningSince: t });
  };

  const pauseAt = (t: number, auto: boolean) => {
    metrics = breakSegment(metrics);
    autoPauseState = initialAutoPause();
    const ms = activeMs(snap, t);
    emit({ status: 'PAUSED', autoPaused: auto, activeMsBase: ms, runningSince: null, currentPaceSec: null, avgPaceSec: averagePace(metrics, ms, policy) });
  };

  const tick = () => {
    const t = now();
    if (snap.status === 'PAUSED' && snap.autoPaused) {
      // 다시 달리기 시작했으면 이어서 기록한다
      if (!watchWhilePaused(t)) return;
    } else if (snap.status !== 'RUNNING') {
      lastTickAt = t;
      return;
    }
    const sinceStart = (t - startedAt) / 1000;
    const poor = scenario === 'poorGps' && sinceStart >= POOR_FROM_SEC && sinceStart < POOR_TO_SEC;
    const patch: Partial<ActiveRunSnapshot> = { gps: poor ? 'poor' : 'good' };
    // 1초마다 point 하나 (배속이면 한 번에 여러 개)
    while (lastTickAt + 1000 <= t) {
      lastTickAt += 1000;
      const v = stoppedAt(lastTickAt) ? 0 : BASE_MPS * pace * (1 + 0.06 * Math.sin(lastTickAt / 1000 / 40));
      travelledM += v;
      const off = scenario === 'offRoute' && track && sinceStart >= OFF_FROM_SEC && sinceStart < OFF_TO_SEC;
      const onRoute = positionAt(travelledM);
      const pos = off ? sideStep(onRoute, positionAt(travelledM + 10), OFF_M) : onRoute;
      // 이탈 중에는 코스를 따라 앞으로 가지 않고 옆길에 머문다
      if (off) travelledM -= v;
      const point: RunPoint = {
        seq: seq++,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: poor ? 35 : 5,
        speed: v,
        recordedAt: lastTickAt,
        qualityFlag: poor ? 'LOW_ACCURACY' : 'OK',
      };
      store.append(point);
      const at = activeMs(snap, lastTickAt);
      metrics = addPoint(metrics, point, at, policy);
      if (track && point.qualityFlag === 'OK') courseState = advanceCourse(track, courseState, pos, lastTickAt, at, policy);
      interval.sample({ activeMs: at, distanceM: metrics.distanceM });
      if (point.qualityFlag === 'OK' && acceptedCount++ % PATH_EVERY === 0) patch.path = [...(patch.path ?? snap.path), pos];
      patch.position = pos;
      if (autoPause) {
        const out = stepAutoPause(autoPauseState, { ...pos, speed: v, accuracy: point.accuracy, timestamp: lastTickAt }, false, policy);
        autoPauseState = out.state;
        if (out.action?.kind === 'pause') {
          emit({ ...patch, distanceM: metrics.distanceM, splits: metrics.splits });
          pauseAt(out.action.at, true);
          lastTickAt = t;
          return;
        }
      }
    }
    if (snap.network === 'online' && t - lastSyncAt >= SYNC_EVERY_SEC * 1000) {
      lastSyncAt = t;
      store.markSynced(runUuid, 0, seq - 1);
    }
    emit({
      ...patch,
      distanceM: metrics.distanceM,
      splits: metrics.splits,
      avgPaceSec: averagePace(metrics, activeMs(snap, t), policy),
      currentPaceSec: poor ? null : currentPace(metrics, policy),
      unsyncedPoints: store.unsyncedCount(),
      ...(track ? { course: courseSnapshot() } : {}),
    });
  };

  const courseSnapshot = () =>
    track
      ? {
          lengthM: track.lengthM,
          progressM: courseState.progressM,
          offRouteM: courseState.offRoute ? Math.round(courseState.offsetM) : null,
          completedActiveMs: courseState.completedActiveMs,
        }
      : null;

  const ensureTimer = () => {
    if (!timer) timer = setInterval(tick, Math.max(50, 1000 / speed));
  };

  return {
    async prepare(input: RunPrepareInput) {
      mode = input.mode;
      autoPause = getPreferences().autoPause && autoPauseAvailable(mode);
      if (input.course && input.course.route.length > 1) {
        track = createCourseTrack(input.course.route);
        path = input.course.route;
        pathM = track.lengthM;
        loopPath = distanceM(path[0], path[path.length - 1]) < 60;
      }
      interval = createIntervalTracking(input.workout ?? null, (boundaries) => emit({ interval: { boundaries } }));
      emit({ mode, gps: 'good', position: positionAt(0), course: courseSnapshot(), interval: interval.active ? { boundaries: [] } : null });
    },
    async start() {
      const t = now();
      startedAt = t;
      lastTickAt = t;
      lastSyncAt = t;
      emit({ status: 'RUNNING', runningSince: t, activeMsBase: 0 });
      ensureTimer();
      return snap;
    },
    async pause() {
      if (snap.status !== 'RUNNING') return;
      pauseAt(now(), false);
    },
    async resume() {
      if (snap.status !== 'PAUSED') return;
      resumeAt(now());
    },
    async finish() {
      const t = now();
      const ms = activeMs(snap, t);
      interval.close({ activeMs: ms, distanceM: metrics.distanceM });
      emit({ status: 'FINISHING', autoPaused: false, activeMsBase: ms, runningSince: null, currentPaceSec: null });
      if (timer) clearInterval(timer);
      timer = null;
      const result = (synced: boolean): RunFinishResult => ({
        clientRunUuid: runUuid,
        mode,
        startedAt: realTime(startedAt),
        distanceM: metrics.distanceM,
        activeSec: Math.round(ms / 1000),
        avgPaceSec: roundPace(averagePace(metrics, ms, policy)),
        splits: metrics.splits,
        synced,
        courseTimeSec: courseState.completedActiveMs != null ? Math.round(courseState.completedActiveMs / 1000) : null,
        path: snap.position ? [...snap.path, snap.position] : snap.path,
        intervalBoundaries: interval.active ? interval.boundaries() : null,
      });
      // 오프라인: 기록은 휴대폰에 남기고 연결되면 올린다 (local-only 결과)
      if (snap.network === 'offline') return result(false);
      // 남은 point를 올린 뒤 종료 (RUN-010). finishPending은 업로드가 오래 걸리는 경우.
      await new Promise((r) => setTimeout(r, scenario === 'finishPending' ? 3000 : 700));
      await store.markSynced(runUuid, 0, seq - 1);
      emit({ status: 'FINISHED', unsyncedPoints: 0 });
      return result(true);
    },
    async discard() {
      if (timer) clearInterval(timer);
      timer = null;
      emit({ status: 'CANCELED', autoPaused: false, runningSince: null, currentPaceSec: null });
    },
    async recover() {
      if (scenario !== 'recovering') return null;
      // 앱이 꺼지기 전까지 1.2km, 6분 40초를 달린 기록이 남아 있던 경우
      const t = now();
      const prevMs = 400_000;
      for (let m = 0, i = 0; m <= 1200; m += BASE_MPS, i++) {
        const pos = positionAt(m);
        const point: RunPoint = { seq: seq++, latitude: pos.latitude, longitude: pos.longitude, accuracy: 5, recordedAt: t - prevMs + i * 1000, qualityFlag: 'OK' };
        store.append(point);
        metrics = addPoint(metrics, point, i * 1000, policy);
        travelledM = m;
      }
      metrics = breakSegment(metrics);
      const path = Array.from({ length: 25 }, (_, i) => positionAt((1200 * i) / 24));
      emit({
        status: 'RECOVERY',
        recovered: true,
        gps: 'acquiring',
        distanceM: metrics.distanceM,
        splits: metrics.splits,
        avgPaceSec: averagePace(metrics, prevMs, policy),
        path,
        position: positionAt(travelledM),
        activeMsBase: prevMs,
        runningSince: null,
        unsyncedPoints: store.unsyncedCount(),
      });
      // GPS를 다시 잡으면 이어서 기록
      setTimeout(() => {
        const t2 = now();
        startedAt = t2 - prevMs;
        lastTickAt = t2;
        lastSyncAt = t2;
        emit({ status: 'RUNNING', gps: 'good', runningSince: t2 });
        ensureTimer();
      }, 1800);
      return snap;
    },
    nextIntervalStep() {
      if (snap.status !== 'RUNNING' && snap.status !== 'PAUSED') return;
      interval.next({ activeMs: activeMs(snap, now()), distanceM: metrics.distanceM });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snap,
    now,
    dispose() {
      if (timer) clearInterval(timer);
      timer = null;
      listeners.clear();
    },
  };
}
