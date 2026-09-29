import { advanceCourse, createCourseTrack, initialCourseProgress, type CourseProgressState, type CourseTrack } from '@/entities/run/courseProgress';
import { addPoint, averagePace, breakSegment, currentPace, initialMetrics, type MetricsState } from '@/entities/run/metrics';
import { autoPauseAvailable, initialAutoPause, stepAutoPause, type AutoPauseState } from '@/entities/run/autoPause';
import { getRunPolicySync, gpsQualityFor } from '@/entities/run/policy';
import type { RunMode, RunPoint } from '@/entities/run/types';
import type { GeoPoint } from '@/shared/geo';
import { getNetworkState, onNetworkChange } from '@/shared/network/network';
import { getPreferences } from '@/shared/preferences';
import { createUuid } from '@/shared/uuid';

import { activeMsAt, type RunSegment } from './localRunStore';
import { startLocationFeed, stopLocationFeed } from './locationFeed';
import { onLocation, setRecording, type LocationEvent } from './recorder';
import { onSyncResult, requestSync, syncRunNow } from '../sync/runSyncService';
import { getRunStore } from './runStore';
import { activeMs, type ActiveRunSnapshot, type RunFinishResult, type RunningEngine, type RunPrepareInput } from './runningEngine';

// 실제 기기 위치로 기록하는 Running Engine (WBS 1 GPS PoC, WBS 2 Running Core).
// 위치는 백그라운드 task → recorder가 SQLite에 먼저 저장하고(RUN-006 Local First), 엔진은 저장된 point로 지표를 계산한다.
// 서버로는 기록 동기화(sync)가 따로 올린다(RUN-007). 네트워크가 없어도 기록은 계속한다.
// 지표 계산(거리 · 페이스 · 스플릿 · 코스 진행)은 mock 엔진과 같은 함수를 쓴다.

// 지도 표시용 경로는 accepted point 5개마다 하나 (77장: 원본 전체를 그리지 않는다)
const PATH_EVERY = 5;
// 이 시간 동안 위치가 오지 않으면 GPS를 다시 찾는 중으로 본다
const GPS_STALE_MS = 10_000;
// 달리는 동안 서버로 올리는 간격 — 명세에 값이 없어 정한 시작값
const SYNC_EVERY_MS = 15_000;
// 종료 때 남은 기록을 이만큼 기다려도 못 올리면 휴대폰에 저장한 결과로 넘어간다(나머지는 뒤에서 계속 올림)
const FINISH_SYNC_TIMEOUT_MS = 20_000;

const roundPace = (p: number | null) => (p == null ? null : Math.round(p));

export function createDeviceRunningEngine(): RunningEngine {
  const policy = getRunPolicySync();
  const listeners = new Set<() => void>();
  const now = () => Date.now();

  let runUuid = createUuid();
  let mode: RunMode = 'FREE';
  let courseId: string | null = null;
  let plan: string | null = null;
  let track: CourseTrack | null = null;
  let courseState: CourseProgressState = initialCourseProgress();
  let metrics: MetricsState = initialMetrics();
  // 달린 구간. 저장소와 같은 값을 메모리에도 두고 point 시점의 active 경과를 계산한다
  let segments: RunSegment[] = [];
  let startedAt = 0;
  let acceptedCount = 0;
  let lastFixAt = 0;
  let unsubscribe: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSyncAt = 0;
  let offNetwork: (() => void) | null = null;
  let offSync: (() => void) | null = null;
  // RUN-009: 설정에서 켰고 혼자 달리는 모드일 때만
  let autoPause = false;
  let autoPauseState: AutoPauseState = initialAutoPause();
  let snap: ActiveRunSnapshot = {
    status: 'PREPARING',
    mode,
    gps: 'acquiring',
    network: getNetworkState(),
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
  };

  const emit = (patch: Partial<ActiveRunSnapshot>) => {
    snap = { ...snap, ...patch };
    listeners.forEach((l) => l());
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

  // point 하나를 지표에 반영한다. 달린 구간이 바뀌는 첫 point면 앞 point와 잇지 않는다.
  let segmentIndex = -1;
  const apply = (p: RunPoint, path: GeoPoint[]) => {
    const k = segments.findLastIndex((s) => s.startedAt <= p.recordedAt);
    if (k !== segmentIndex) {
      if (segmentIndex !== -1) metrics = breakSegment(metrics);
      segmentIndex = k;
    }
    const at = activeMsAt(segments, p.recordedAt);
    metrics = addPoint(metrics, p, at, policy);
    if (p.qualityFlag !== 'OK') return;
    if (track) courseState = advanceCourse(track, courseState, p, p.recordedAt, at, policy);
    if (acceptedCount++ % PATH_EVERY === 0) path.push({ latitude: p.latitude, longitude: p.longitude });
  };

  const metricPatch = (): Partial<ActiveRunSnapshot> => ({
    distanceM: metrics.distanceM,
    splits: metrics.splits,
    avgPaceSec: averagePace(metrics, activeMs(snap, now()), policy),
    currentPaceSec: snap.status === 'RUNNING' ? currentPace(metrics, policy) : null,
    ...(track ? { course: courseSnapshot() } : {}),
  });

  const handle = ({ latest, saved }: LocationEvent) => {
    lastFixAt = now();
    const gps = gpsQualityFor(latest.accuracy, policy);
    const position = { latitude: latest.latitude, longitude: latest.longitude };
    if (snap.status === 'RECOVERY') {
      // GPS를 다시 잡으면 이어서 기록한다
      if (gps === 'good' || gps === 'fair') resumeRunning();
      emit({ gps, position });
      return;
    }
    if (saved.length === 0) {
      emit({ gps, position });
      return;
    }
    const path = [...snap.path];
    saved.forEach((p) => apply(p, path));
    emit({
      gps,
      position,
      ...(path.length !== snap.path.length ? { path } : {}),
      unsyncedPoints: snap.unsyncedPoints + saved.length,
      ...metricPatch(),
    });
    detectAutoPause(latest);
  };

  // 사용자가 직접 멈춘 동안에는 보지 않는다 (직접 멈추면 직접 이어 간다)
  const detectAutoPause = (l: LocationEvent['latest']) => {
    if (!autoPause || !(snap.status === 'RUNNING' || (snap.status === 'PAUSED' && snap.autoPaused))) return;
    const out = stepAutoPause(autoPauseState, { latitude: l.latitude, longitude: l.longitude, speed: l.speed, accuracy: l.accuracy, timestamp: l.timestamp }, snap.status === 'PAUSED', policy);
    autoPauseState = out.state;
    if (out.action?.kind === 'pause') void pauseAt(Math.min(now(), Math.max(out.action.at, snap.runningSince ?? 0)), true);
    else if (out.action?.kind === 'resume') resumeRunning();
  };

  const pauseAt = async (t: number, auto: boolean) => {
    if (snap.status !== 'RUNNING') return;
    const ms = activeMs(snap, t);
    closeSegment(t);
    metrics = breakSegment(metrics);
    setRecording({ runUuid, running: false, since: t });
    autoPauseState = initialAutoPause();
    emit({ status: 'PAUSED', autoPaused: auto, activeMsBase: ms, runningSince: null, currentPaceSec: null, avgPaceSec: averagePace(metrics, ms, policy) });
    await (await getRunStore()).pauseRun(runUuid, t);
  };

  const ensureListening = async () => {
    unsubscribe ??= onLocation(handle);
    offNetwork ??= onNetworkChange((network) => emit({ network }));
    offSync ??= onSyncResult((uuid, out) => {
      if (uuid === runUuid && snap.status !== 'FINISHING' && snap.status !== 'FINISHED') emit({ unsyncedPoints: out.unsynced });
    });
    timer ??= setInterval(() => {
      if (lastFixAt && now() - lastFixAt > GPS_STALE_MS && snap.gps !== 'acquiring' && snap.status !== 'FINISHING' && snap.status !== 'FINISHED') {
        emit({ gps: 'acquiring', currentPaceSec: null });
      }
      // RUN-007: 달리는 동안 모인 point를 주기적으로 올린다
      if ((snap.status === 'RUNNING' || snap.status === 'PAUSED') && now() - lastSyncAt >= SYNC_EVERY_MS) {
        lastSyncAt = now();
        requestSync();
      }
    }, 1000);
    try {
      await startLocationFeed();
    } catch (e) {
      console.warn('[run] location feed', e);
      emit({ gps: 'unavailable' });
    }
  };

  const stopListening = () => {
    unsubscribe?.();
    unsubscribe = null;
    offNetwork?.();
    offNetwork = null;
    offSync?.();
    offSync = null;
    if (timer) clearInterval(timer);
    timer = null;
    stopLocationFeed().catch(() => undefined);
  };

  const resumeRunning = () => {
    const t = now();
    segments = [...segments, { startedAt: t, endedAt: null }];
    metrics = breakSegment(metrics);
    setRecording({ runUuid, running: true, since: t });
    autoPauseState = initialAutoPause();
    emit({ status: 'RUNNING', autoPaused: false, runningSince: t });
    getRunStore()
      .then((s) => s.resumeRun(runUuid, t))
      .catch((e) => console.warn('[run] resume', e));
  };

  const closeSegment = (t: number) => {
    segments = segments.map((s) => (s.endedAt == null ? { ...s, endedAt: Math.max(s.startedAt, t) } : s));
  };

  return {
    async prepare(input: RunPrepareInput) {
      mode = input.mode;
      courseId = input.course?.id ?? null;
      plan = input.plan ?? null;
      autoPause = getPreferences().autoPause && autoPauseAvailable(mode);
      if (input.course && input.course.route.length > 1) track = createCourseTrack(input.course.route);
      emit({ mode, course: courseSnapshot() });
      // 카운트다운 동안 GPS를 미리 켠다. 시작 전 위치는 저장하지 않는다.
      await ensureListening();
    },

    async start() {
      const t = now();
      startedAt = t;
      segments = [{ startedAt: t, endedAt: null }];
      const store = await getRunStore();
      await store.createRun({ clientRunUuid: runUuid, mode, courseId, plan, startedAt: t });
      setRecording({ runUuid, running: true, since: t });
      emit({ status: 'RUNNING', runningSince: t, activeMsBase: 0 });
      return snap;
    },

    async pause() {
      await pauseAt(now(), false);
    },

    async resume() {
      if (snap.status !== 'PAUSED') return;
      resumeRunning();
    },

    async finish() {
      const t = now();
      const ms = activeMs(snap, t);
      const wasRunning = snap.status === 'RUNNING';
      if (wasRunning) closeSegment(t);
      setRecording(null);
      emit({ status: 'FINISHING', autoPaused: false, activeMsBase: ms, runningSince: null, currentPaceSec: null });
      stopListening();
      const store = await getRunStore();
      await store.endRun(runUuid, t, 'FINISHED');
      // RUN-010: 남은 point를 올리고 서버 finish까지. 오프라인이거나 오래 걸리면 휴대폰에 저장한 결과(local-only)로 넘어가고
      // 나머지는 기록 동기화가 연결되는 대로 이어서 올린다.
      emit({ unsyncedPoints: await store.countUnsynced(runUuid), network: getNetworkState() });
      let synced = false;
      if (getNetworkState() === 'online') {
        const out = await Promise.race([
          syncRunNow(runUuid, (n) => emit({ unsyncedPoints: n })),
          new Promise<null>((r) => setTimeout(() => r(null), FINISH_SYNC_TIMEOUT_MS)),
        ]).catch(() => null);
        synced = out?.state === 'synced';
      }
      if (synced) emit({ status: 'FINISHED', unsyncedPoints: 0 });
      return {
        clientRunUuid: runUuid,
        mode,
        startedAt,
        distanceM: metrics.distanceM,
        activeSec: Math.round(ms / 1000),
        avgPaceSec: roundPace(averagePace(metrics, ms, policy)),
        splits: metrics.splits,
        synced,
        courseTimeSec: courseState.completedActiveMs != null ? Math.round(courseState.completedActiveMs / 1000) : null,
        path: snap.position && snap.path.length ? [...snap.path, snap.position] : snap.path,
      } satisfies RunFinishResult;
    },

    // 11.3장: 앱이 꺼지기 전 RUNNING · PAUSED로 남은 러닝을 SQLite에서 불러와 이어서 기록한다.
    // prepare(모드 · 코스)를 먼저 부른다.
    async recover() {
      const store = await getRunStore();
      const open = await store.findOpenRun();
      if (!open) return null;
      runUuid = open.clientRunUuid;
      mode = open.mode;
      startedAt = open.startedAt;
      courseId = open.courseId;
      plan = open.plan;
      autoPause = getPreferences().autoPause && autoPauseAvailable(mode);
      const points = await store.getPoints(runUuid);
      const wasRunning = open.status === 'RUNNING';
      if (wasRunning) {
        // 꺼져 있던 시간은 달린 시간에 넣지 않는다. 마지막으로 저장한 point까지만 달린 것으로 본다.
        const openSegment = (await store.getSegments(runUuid)).find((s) => s.endedAt == null);
        const lastAt = Math.max(points[points.length - 1]?.recordedAt ?? 0, openSegment?.startedAt ?? 0);
        await store.pauseRun(runUuid, lastAt);
      }
      segments = await store.getSegments(runUuid);
      setRecording({ runUuid, running: false, since: points[points.length - 1]?.recordedAt ?? now() });

      metrics = initialMetrics();
      courseState = initialCourseProgress();
      acceptedCount = 0;
      segmentIndex = -1;
      const path: GeoPoint[] = [];
      points.forEach((p) => apply(p, path));
      metrics = breakSegment(metrics);
      const last = points[points.length - 1];
      const recoveredMs = activeMsAt(segments, Number.MAX_SAFE_INTEGER);
      emit({
        status: wasRunning ? 'RECOVERY' : 'PAUSED',
        mode,
        recovered: true,
        gps: 'acquiring',
        path,
        position: last ? { latitude: last.latitude, longitude: last.longitude } : null,
        activeMsBase: recoveredMs,
        runningSince: null,
        unsyncedPoints: await store.countUnsynced(runUuid),
        ...metricPatch(),
        avgPaceSec: averagePace(metrics, recoveredMs, policy),
        currentPaceSec: null,
      });
      await ensureListening();
      return snap;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snap,
    now,
    dispose() {
      // 기록 중인 러닝을 버리지 않는다. 기록 상태가 남아 있으면 다음 실행 때 복구한다.
      if (snap.status === 'PREPARING' || snap.status === 'FINISHING' || snap.status === 'FINISHED') setRecording(null);
      stopListening();
      listeners.clear();
    },
  };
}
