import { useEffect, useState, useSyncExternalStore } from 'react';

import { recordHeartRate } from './heartRateLog';

// 달리는 동안 받은 최근 심박. Apple Watch(5초마다)와 블루투스 심박 센서(1초마다)가 넣는다 (결정 로그 65 · 80항).
// 둘 다 있으면 센서 값을 쓴다 (센서가 더 자주 · 정확하게 잰다). 기록에는 워치와 같은 간격(약 5초)으로 하나씩 남긴다.

export type HeartSource = 'watch' | 'sensor';

// 이보다 오래된 심박은 보여 주지 않는다 (워치를 벗었거나 연결이 끊김)
const HEART_STALE_MS = 15_000;
// 기록 간격. 워치는 5초마다 보내서 조금 짧게 둔다 (도착 시각이 흔들려도 빠지지 않게)
const RECORD_GAP_MS = 4000;

let heart: { bpm: number; at: number; source: HeartSource } | null = null;
let lastRecordedAt = 0;
const listeners = new Set<() => void>();

export function pushHeartRate(bpm: number, at: number, source: HeartSource) {
  if (source === 'watch' && heart?.source === 'sensor' && at - heart.at < HEART_STALE_MS) return;
  heart = { bpm, at, source };
  listeners.forEach((fn) => fn());
  if (at - lastRecordedAt < RECORD_GAP_MS) return;
  lastRecordedAt = at;
  recordHeartRate(bpm, at);
}

/** 새 러닝을 시작할 때 이전 값을 지운다 */
export function resetHeartRate() {
  heart = null;
  lastRecordedAt = 0;
  listeners.forEach((fn) => fn());
}

/** 최근 심박(bpm). 15초 넘게 새 값이 없으면 null */
export function useLiveHeartRate(): number | null {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => heart,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!value) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [value]);
  return value && Math.max(now, value.at) - value.at < HEART_STALE_MS ? value.bpm : null;
}
