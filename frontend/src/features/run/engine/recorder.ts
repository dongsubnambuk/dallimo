import { getRunPolicySync } from '@/entities/run/policy';
import type { RunPoint } from '@/entities/run/types';
import { distanceM } from '@/shared/geo';
import type { RawLocation } from '@/shared/location/locationSource';

import type { NewRunPoint } from './localRunStore';
import { getRunStore } from './runStore';

// 29.3장 Background Task 책임: GPS 수신 → 품질 표시 → SQLite append.
// 백그라운드 위치 task(iOS · Android)와 웹 watch가 모두 여기로 위치를 넘긴다.
// 화면이 떠 있으면 엔진이 구독해 지표를 갱신하고, 앱이 백그라운드에서 다시 켜져 엔진이 없어도 저장은 계속한다.

export type LocationEvent = {
  // 받은 위치 중 가장 최근 것 (저장 여부와 상관없이 내 위치 · GPS 상태 표시용)
  latest: RawLocation;
  // 이번에 저장한 point (달리는 중이 아니면 빈 배열)
  saved: RunPoint[];
};

// 순간 이동(JUMP)이 이만큼 이어지면 새 위치를 기준으로 다시 잡는다.
// 첫 point가 튄 경우 이후 정상 point가 모두 JUMP가 되는 것을 막는다 — PoC 시작값.
const JUMP_REANCHOR_COUNT = 3;

// 지금 기록 중인 러닝. undefined는 "아직 모름"(앱이 백그라운드에서 새로 켜진 경우)이라 저장소에서 찾는다.
type Recording = { runUuid: string; running: boolean } | null;
let recording: Recording | undefined;
// 이 시각 이후 위치만 저장한다 (시작 전 · 일시정지 중 위치, 같은 위치 중복 제외)
let recordAfter = 0;
let lastAccepted: { latitude: number; longitude: number; recordedAt: number } | null = null;
let jumpStreak = 0;

const listeners = new Set<(e: LocationEvent) => void>();
let chain: Promise<void> = Promise.resolve();

/** 지금 달리는 중인(일시정지 아님) 기기 러닝. 워치 심박을 이 러닝에 남긴다 (결정 로그 65항) */
export function runningRunUuid(): string | null {
  return recording?.running ? recording.runUuid : null;
}

/** 엔진이 기록 상태를 알려준다. running이 true가 된 시각(since) 이전 위치는 저장하지 않는다. */
export function setRecording(next: { runUuid: string; running: boolean; since: number } | null) {
  if (!next || next.runUuid !== recording?.runUuid) {
    lastAccepted = null;
    jumpStreak = 0;
  }
  recording = next ? { runUuid: next.runUuid, running: next.running } : null;
  recordAfter = next ? Math.max(recordAfter, next.since) : 0;
}

export function onLocation(listener: (e: LocationEvent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 위치 묶음을 받는다. 순서를 지키기 위해 한 번에 하나씩 처리한다. */
export function deliverLocations(locations: RawLocation[]): Promise<void> {
  chain = chain.then(() => handle(locations)).catch((e) => console.warn('[recorder]', e));
  return chain;
}

// 51장: structural validation → temporal order
const valid = (l: RawLocation) =>
  Number.isFinite(l.latitude) &&
  Number.isFinite(l.longitude) &&
  Math.abs(l.latitude) <= 90 &&
  Math.abs(l.longitude) <= 180 &&
  Number.isFinite(l.timestamp);

async function handle(locations: RawLocation[]) {
  const list = locations.filter(valid).sort((a, b) => a.timestamp - b.timestamp);
  const latest = list[list.length - 1];
  if (!latest) return;

  let saved: RunPoint[] = [];
  const rec = await currentRecording();
  if (rec?.running) {
    const fresh = list.filter((l) => l.timestamp > recordAfter);
    if (fresh.length) {
      const store = await getRunStore();
      saved = await store.appendPoints(rec.runUuid, fresh.map(classify));
      recordAfter = fresh[fresh.length - 1].timestamp;
    }
  }
  listeners.forEach((l) => l({ latest, saved }));
}

async function currentRecording(): Promise<Recording> {
  if (recording !== undefined) return recording;
  // 앱이 꺼졌다가 위치 task로 다시 켜진 경우: 남아 있는 러닝을 찾아 이어서 저장한다
  const store = await getRunStore();
  const open = await store.findOpenRun();
  if (recording !== undefined) return recording;
  recording = open ? { runUuid: open.clientRunUuid, running: open.status === 'RUNNING' } : null;
  if (open) {
    const points = await store.getPoints(open.clientRunUuid);
    const last = points[points.length - 1];
    recordAfter = Math.max(recordAfter, last?.recordedAt ?? open.startedAt);
    const ok = [...points].reverse().find((p) => p.qualityFlag === 'OK');
    lastAccepted = ok ? { latitude: ok.latitude, longitude: ok.longitude, recordedAt: ok.recordedAt } : null;
  }
  return recording;
}

// 51장: accuracy metadata → anomaly classification. 원본은 그대로 두고 표시만 붙인다.
function classify(l: RawLocation): NewRunPoint {
  const policy = getRunPolicySync();
  const base = {
    latitude: l.latitude,
    longitude: l.longitude,
    ...(l.altitude != null ? { altitude: l.altitude } : {}),
    accuracy: l.accuracy ?? Number.NaN,
    ...(l.speed != null && l.speed >= 0 ? { speed: l.speed } : {}),
    recordedAt: l.timestamp,
  };
  if (l.accuracy == null || l.accuracy > policy.gpsRequiredAccuracyM) return { ...base, qualityFlag: 'LOW_ACCURACY' };
  if (lastAccepted && jumpStreak < JUMP_REANCHOR_COUNT) {
    // 1초보다 짧은 간격은 1초로 본다 (짧은 간격에서 속도가 과하게 커지는 것을 막음)
    const sec = Math.max(1, (l.timestamp - lastAccepted.recordedAt) / 1000);
    if (distanceM(lastAccepted, l) / sec > policy.gpsMaxSpeedMps) {
      jumpStreak += 1;
      return { ...base, qualityFlag: 'JUMP' };
    }
  }
  jumpStreak = 0;
  lastAccepted = { latitude: l.latitude, longitude: l.longitude, recordedAt: l.timestamp };
  return { ...base, qualityFlag: 'OK' };
}
