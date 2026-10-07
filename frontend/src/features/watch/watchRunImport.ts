import { runResultRepository } from '@/entities/run/api';
import { addPoint, averagePace, breakSegment, initialMetrics } from '@/entities/run/metrics';
import { getRunPolicy } from '@/entities/run/policy';
import type { RunPoint, RunPointQuality } from '@/entities/run/types';
import type { HeartRateSample, ImportedRun, NewRunPoint } from '@/features/run/engine/localRunStore';
import { activeMsAt } from '@/features/run/engine/localRunStore';
import { getRunStore } from '@/features/run/engine/runStore';
import { requestSync } from '@/features/run/sync/runSyncService';
import { getPreferences } from '@/shared/preferences';
import { watchTransport } from '@/shared/watch/watchTransport';

// 워치 단독 기록 (결정 로그 81항). 휴대폰 없이 워치 GPS로 달린 러닝을 워치가 파일로 보내면(WatchConnectivity transferFile)
// 휴대폰이 받아 두고(modules/dallimo-watch 받은 편지함), 여기서 기기 저장소에 끝난 러닝으로 넣은 뒤 기록 동기화로 서버까지 올린다.
// 서버에는 휴대폰으로 달린 러닝과 같은 달리모 기록(source DALLIMO)으로 올라간다.
//
// 파일 모양 (워치 targets/watch/WatchRecorder.swift와 같다, v1):
// { v: 1, runUuid, mode: 'FREE', startedAt, endedAt, segments: [[시작, 끝]], points: [[위도, 경도, 고도|null, 정확도, 속도|null, 시각, 품질]], heart: [[시각, bpm]] }
// 시각은 epoch ms, 품질은 0 OK · 1 LOW_ACCURACY · 2 JUMP

const QUALITY: Record<number, RunPointQuality> = { 0: 'OK', 1: 'LOW_ACCURACY', 2: 'JUMP' };
// 서버 심박 검증 범위 (heartRateLog와 같다)
const HEART_MIN = 30;
const HEART_MAX = 250;
// 이보다 짧으면 기록으로 남기지 않는다 (잘못 눌러 바로 끝낸 경우)
const MIN_POINTS = 2;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 워치 파일을 기기 저장소 모양으로. 모양이 틀리면 null */
export function parseWatchRun(json: string): ImportedRun | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const startedAt = num(r.startedAt);
  const endedAt = num(r.endedAt);
  if (r.v !== 1 || typeof r.runUuid !== 'string' || !r.runUuid || startedAt == null || endedAt == null || endedAt < startedAt) return null;

  const segments = (Array.isArray(r.segments) ? r.segments : [])
    .map((s) => (Array.isArray(s) ? { startedAt: num(s[0]), endedAt: num(s[1]) } : null))
    .filter((s): s is { startedAt: number; endedAt: number } => s != null && s.startedAt != null && s.endedAt != null && s.endedAt >= s.startedAt)
    .sort((a, b) => a.startedAt - b.startedAt);

  const points: NewRunPoint[] = [];
  for (const p of Array.isArray(r.points) ? r.points : []) {
    if (!Array.isArray(p)) continue;
    const [lat, lon, alt, acc, speed, at, q] = p.map(num);
    if (lat == null || lon == null || at == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    points.push({
      latitude: lat,
      longitude: lon,
      ...(alt != null ? { altitude: alt } : {}),
      accuracy: acc ?? Number.NaN,
      ...(speed != null && speed >= 0 ? { speed } : {}),
      recordedAt: at,
      qualityFlag: QUALITY[q ?? 1] ?? 'LOW_ACCURACY',
    });
  }
  points.sort((a, b) => a.recordedAt - b.recordedAt);

  const heart: HeartRateSample[] = [];
  for (const h of Array.isArray(r.heart) ? r.heart : []) {
    if (!Array.isArray(h)) continue;
    const at = num(h[0]);
    const bpm = num(h[1]);
    if (at != null && bpm != null && bpm >= HEART_MIN && bpm <= HEART_MAX) heart.push({ recordedAt: at, bpm: Math.round(bpm) });
  }

  return {
    clientRunUuid: r.runUuid,
    // 1단계는 자유 달리기만 워치에서 시작한다
    mode: 'FREE',
    courseId: null,
    plan: JSON.stringify({ source: 'watch' }),
    startedAt,
    endedAt,
    segments: segments.length ? segments : [{ startedAt, endedAt }],
    points,
    heart,
  };
}

/** 결과 화면 · 히스토리에 바로 보일 값. 휴대폰 엔진과 같은 계산(51장)으로 다시 잰다 */
async function resultOf(run: ImportedRun) {
  const policy = await getRunPolicy();
  let metrics = initialMetrics();
  let segment = 0;
  run.points.forEach((p, i) => {
    // 일시정지를 넘어가면 앞뒤 point를 잇지 않는다
    const seg = run.segments.findIndex((s) => p.recordedAt >= s.startedAt && p.recordedAt <= s.endedAt);
    if (seg < 0) return;
    if (seg !== segment) metrics = breakSegment(metrics);
    segment = seg;
    const point: RunPoint = { ...p, seq: i + 1 };
    metrics = addPoint(metrics, point, activeMsAt(run.segments, p.recordedAt), policy);
  });
  const activeMs = activeMsAt(run.segments, run.endedAt);
  const pace = averagePace(metrics, activeMs, policy);
  return {
    clientRunUuid: run.clientRunUuid,
    mode: run.mode,
    startedAt: run.startedAt,
    distanceM: metrics.distanceM,
    activeSec: Math.round(activeMs / 1000),
    avgPaceSec: pace == null ? null : Math.round(pace),
    splits: metrics.splits,
    path: run.points.filter((p) => p.qualityFlag === 'OK').map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    course: null,
    target: null,
  };
}

let running: Promise<number> | null = null;

/**
 * 받아 둔 워치 기록을 모두 넣는다. 넣었거나 이미 있으면 워치 편지함에서 지운다. 넣은 수를 돌려준다.
 * 앱을 켤 때 · 앞으로 올 때 · 워치가 새 기록을 보냈을 때 부른다 (로그인한 뒤에만)
 */
export function importWatchRuns(): Promise<number> {
  running ??= (async () => {
    let added = 0;
    try {
      const store = await getRunStore();
      for (const file of await watchTransport.pendingRuns()) {
        const run = parseWatchRun(file.json);
        if (!run || run.points.length < MIN_POINTS) {
          // 읽을 수 없거나 너무 짧은 기록은 버린다 (다시 받아도 같다)
          watchTransport.ackRun(file.id);
          continue;
        }
        // 심박은 저장에 동의했을 때만 (결정 로그 65항)
        const input = getPreferences().heartRateSave ? run : { ...run, heart: [] };
        if (await store.importFinishedRun(input)) {
          await runResultRepository.saveFinished(await resultOf(run), false);
          added += 1;
        }
        watchTransport.ackRun(file.id);
      }
    } catch (e) {
      console.warn('[watch] import', e);
    } finally {
      running = null;
    }
    if (added) requestSync();
    return added;
  })();
  return running;
}
