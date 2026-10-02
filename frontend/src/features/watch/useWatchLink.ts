import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { ActiveRunSnapshot, RunningEngine } from '@/features/run/engine/runningEngine';
import { recordHeartRate } from '@/features/run/heartRateLog';
import { setHapticsMirror } from '@/shared/haptics';
import { getPreferences, usePreferences } from '@/shared/preferences';
import { watchTransport, type WatchCommand } from '@/shared/watch/watchTransport';

import { countdownMessage, cueMessage, endMessage, idleMessage, runMessage, type WatchRunContext } from './watchMessages';

// WATCH-001~004: 휴대폰이 기록하고 워치는 보여 주기 · 조작 · 심박을 맡는다 (결정 로그 48항).
// 달리는 동안 1초마다 지금 상태를 워치로 보내고, 워치에서 온 일시정지 · 끝내기 · 다음 구간 · 심박을 받는다.

const SEND_MS = 1000;
// 이보다 오래된 심박은 보여 주지 않는다 (워치를 벗었거나 연결이 끊김)
const HEART_STALE_MS = 15_000;

// ── 심박 (워치 → 휴대폰) ──
let heart: { bpm: number; at: number } | null = null;
const heartListeners = new Set<() => void>();

function setHeart(bpm: number, at: number) {
  heart = { bpm, at };
  heartListeners.forEach((fn) => fn());
}

/** 워치에서 받은 최근 심박(bpm). 15초 넘게 새 값이 없으면 null */
export function useWatchHeartRate(): number | null {
  const value = useSyncExternalStore(
    (fn) => {
      heartListeners.add(fn);
      return () => heartListeners.delete(fn);
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

function linkOn(): boolean {
  return getPreferences().watchMirror && watchTransport.state().installed;
}

/** 출발 카운트다운을 시작할 때 워치 앱을 켠다 (워치에서 운동 세션이 시작되고 같은 숫자를 보여 준다) */
export function useWatchCountdown(title: string, count: number, active: boolean) {
  const launched = useRef(false);
  useEffect(() => {
    if (!active || launched.current || !linkOn()) return;
    launched.current = true;
    heart = null;
    void watchTransport.launch();
  }, [active]);
  useEffect(() => {
    if (!active || count < 0 || !linkOn()) return;
    watchTransport.send(countdownMessage(title, count));
  }, [active, title, count]);
}

/** 카운트다운 없이 기록을 시작할 때(이어 달리기 · 함께 달리기) 워치 앱을 켠다 */
export function launchWatchApp() {
  if (linkOn()) void watchTransport.launch();
}

/** 저장한 뒤 워치 요약 (워치는 운동을 건강 앱에 저장하고 끝낸다) */
export function sendWatchEnd(result: Parameters<typeof endMessage>[0], title: string) {
  if (!linkOn()) return;
  const m = endMessage(result, title);
  watchTransport.send(m);
  watchTransport.setContext(m);
}

/** 러닝 없이 나감 (취소 · 기록 없음). 워치는 운동을 저장하지 않고 끝낸다 */
export function sendWatchIdle() {
  if (!linkOn()) return;
  watchTransport.send(idleMessage());
  watchTransport.setContext(idleMessage());
}

type WatchLinkOptions = {
  // 지금 워치에 보여 줄 제목 · 모드별 한 줄 · 조작 가능 여부
  context: (s: ActiveRunSnapshot, now: number) => WatchRunContext;
  onCommand: (cmd: WatchCommand) => void;
};

export function useWatchLink(engine: RunningEngine, options: WatchLinkOptions) {
  const on = usePreferences().watchMirror;
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!on) return;
    let lastSent = 0;
    let lastStatus: ActiveRunSnapshot['status'] | null = null;
    let splits = engine.getSnapshot().splits.length;

    const push = () => {
      const s = engine.getSnapshot();
      if (s.status === 'PREPARING' || s.status === 'FINISHED' || s.status === 'CANCELED') return;
      const now = engine.now();
      const m = runMessage(s, now, Date.now(), latest.current.context(s, now));
      watchTransport.send(m);
      // 상태가 바뀔 때는 마지막 상태로도 남긴다 (워치 앱이 나중에 켜져도 안다)
      if (s.status !== lastStatus) watchTransport.setContext(m);
      lastStatus = s.status;
      lastSent = Date.now();
      // 1km마다 워치 햅틱
      if (s.splits.length > splits) watchTransport.send(cueMessage('split'));
      splits = s.splits.length;
    };

    const unsubscribe = engine.subscribe(() => {
      if (Date.now() - lastSent >= SEND_MS || engine.getSnapshot().status !== lastStatus) push();
    });
    const timer = setInterval(push, SEND_MS);
    const offMessage = watchTransport.onMessage((m) => {
      if (m.t === 'hr') {
        setHeart(m.bpm, m.at);
        recordHeartRate(m.bpm, m.at);
      }
      else if (m.t === 'hello') {
        lastStatus = null;
        push();
      } else latest.current.onCommand(m.cmd);
    });
    // WATCH-004: 휴대폰과 같은 햅틱을 워치에서도
    setHapticsMirror((kind) => watchTransport.send(cueMessage(kind)));
    push();
    return () => {
      unsubscribe();
      clearInterval(timer);
      offMessage();
      setHapticsMirror(null);
    };
  }, [engine, on]);
}
