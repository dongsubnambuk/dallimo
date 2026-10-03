import { useEffect, useRef } from 'react';

import type { ActiveRunSnapshot, RunningEngine } from '@/features/run/engine/runningEngine';
import { pushHeartRate, resetHeartRate } from '@/features/run/heartRateLive';
import { setHapticsMirror } from '@/shared/haptics';
import { getPreferences, usePreferences } from '@/shared/preferences';
import { watchTransport, type WatchCommand } from '@/shared/watch/watchTransport';

import { countdownMessage, cueMessage, endMessage, idleMessage, runMessage, type WatchRunContext } from './watchMessages';

// WATCH-001~004: 휴대폰이 기록하고 워치는 보여 주기 · 조작 · 심박을 맡는다 (결정 로그 48항).
// 달리는 동안 1초마다 지금 상태를 워치로 보내고, 워치에서 온 일시정지 · 끝내기 · 다음 구간 · 심박을 받는다.

const SEND_MS = 1000;

function linkOn(): boolean {
  return getPreferences().watchMirror && watchTransport.state().installed;
}

/** 출발 카운트다운을 시작할 때 워치 앱을 켠다 (워치에서 운동 세션이 시작되고 같은 숫자를 보여 준다) */
export function useWatchCountdown(title: string, count: number, active: boolean) {
  const launched = useRef(false);
  useEffect(() => {
    if (!active || launched.current || !linkOn()) return;
    launched.current = true;
    resetHeartRate();
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
      if (m.t === 'hr') pushHeartRate(m.bpm, m.at, 'watch');
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
