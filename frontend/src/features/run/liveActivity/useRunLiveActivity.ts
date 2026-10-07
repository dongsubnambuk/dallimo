import { useEffect, useRef } from 'react';

import type { ActiveRunSnapshot, RunningEngine } from '@/features/run/engine/runningEngine';
import { runMessage, type WatchRunContext, type WatchRunMessage } from '@/features/watch/watchMessages';
import { liveActivity, type LiveActivityState } from '@/shared/liveActivity/liveActivity';
import { usePreferences } from '@/shared/preferences';

// 잠금 화면 · 다이내믹 아일랜드 (결정 로그 83항). 워치와 같은 내용(거리 · 시간 · 페이스 · 모드별 한 줄 · 함께 달리기 참가자)을 보낸다.
// 시간은 위젯이 스스로 세므로 몇 초마다만 바꾼다. 상태(달리는 중 · 일시정지)가 바뀌면 바로 바꾼다.
// 끝나면 저장 요약을 잠깐 남기고, 취소 · 기록 없이 끝내면 바로 지운다

const UPDATE_MS = 5000;
// 끝난 뒤 잠금 화면에 요약을 남겨 두는 시간
const SUMMARY_SEC = 5 * 60;

function stateOf(m: WatchRunMessage, finished: boolean): LiveActivityState {
  return {
    status: finished ? 'finished' : m.running ? 'running' : 'paused',
    distanceKm: m.distanceKm,
    pace: m.pace,
    elapsedSec: Math.round(m.activeMs / 1000),
    timerStart: m.running && !finished ? (m.sentAt - m.activeMs) / 1000 : null,
    ...(m.stripLabel && m.stripValue ? { stripLabel: m.stripLabel, stripValue: m.stripValue, stripTone: m.stripTone } : {}),
    people: m.people,
  };
}

type Options = { context: (s: ActiveRunSnapshot, now: number) => WatchRunContext };

export function useRunLiveActivity(engine: RunningEngine, options: Options) {
  const on = usePreferences().liveActivity;
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!on || !liveActivity.enabled()) return;
    let id: string | null = null;
    let starting: Promise<string | null> | null = null;
    let lastStatus: ActiveRunSnapshot['status'] | null = null;
    let lastSent = 0;

    const message = () => {
      const s = engine.getSnapshot();
      return { s, m: runMessage(s, engine.now(), Date.now(), latest.current.context(s, engine.now())) };
    };

    const push = () => {
      const { s, m } = message();
      if (s.status === 'PREPARING' || s.status === 'CANCELED') return;
      const finished = s.status === 'FINISHING' || s.status === 'FINISHED';
      lastStatus = s.status;
      lastSent = Date.now();
      if (!id && !starting) {
        if (finished) return;
        starting = liveActivity.start(m.title, stateOf(m, false)).then((x) => (id = x));
        return;
      }
      if (id) void liveActivity.update(id, stateOf(m, finished));
    };

    const unsubscribe = engine.subscribe(() => {
      const st = engine.getSnapshot().status;
      if (st !== lastStatus || Date.now() - lastSent >= UPDATE_MS) push();
    });
    const timer = setInterval(push, UPDATE_MS);
    push();

    return () => {
      unsubscribe();
      clearInterval(timer);
      const { s, m } = message();
      const saved = s.status === 'FINISHING' || s.status === 'FINISHED';
      void (starting ?? Promise.resolve(id)).then((x) => {
        if (x) void liveActivity.end(x, saved ? stateOf(m, true) : null, SUMMARY_SEC);
      });
    };
  }, [engine, on]);
}
