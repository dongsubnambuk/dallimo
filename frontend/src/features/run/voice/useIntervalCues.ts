import { useEffect, useRef } from 'react';

import { getRunPolicySync } from '@/entities/run/policy';
import { intervalNow, resultGap, stepResults } from '@/entities/workout/tracker';
import type { FlatStep } from '@/entities/workout/types';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { activeMs, type RunningEngine } from '@/features/run/engine/runningEngine';
import { haptics } from '@/shared/haptics';
import { speak } from '@/shared/voice';

import { DONE_SENTENCE, nearEndSentence, nextSentence, startSentence, stepEndSentence, WORK_NEAR_END } from './intervalCues';

// 인터벌 달리기 소리 · 진동 (123.2장). 출발할 때 첫 구간, 구간이 바뀌면 방금 구간 결과 + 다음 구간, 빠르게 구간이 끝나 갈 때 한 번.
// 음성 · 진동을 끄면 shared/voice · haptics가 알아서 쉰다.
export function useIntervalCues(engine: RunningEngine, flat: FlatStep[] | null) {
  const count = useRunSnapshot(engine, (s) => s.interval?.boundaries.length ?? 0);
  const status = useRunSnapshot(engine, (s) => s.status);
  const prev = useRef<number | null>(null);
  const near = useRef(-1);

  // 첫 구간 (이어 달리기면 읽지 않는다)
  useEffect(() => {
    if (!flat?.length || prev.current != null || status !== 'RUNNING') return;
    prev.current = count;
    if (count === 0 && !engine.getSnapshot().recovered) speak(startSentence(flat[0]));
  }, [flat, status, count, engine]);

  // 구간이 바뀌었다
  useEffect(() => {
    if (!flat?.length || prev.current == null || count <= prev.current) return;
    prev.current = count;
    const boundaries = engine.getSnapshot().interval?.boundaries ?? [];
    const last = boundaries[boundaries.length - 1];
    // 종료하며 닫은 구간은 읽지 않는다
    if (!last?.completed) return;
    const results = stepResults(flat, boundaries);
    const done = results[results.length - 1];
    const end = stepEndSentence(done, resultGap(done, getRunPolicySync().minPaceSampleM));
    const next = flat[boundaries.length];
    if (next) {
      haptics.intervalStep();
      speak(`${end} ${nextSentence(next)}`);
    } else {
      haptics.complete();
      speak(`${end} ${DONE_SENTENCE}`);
    }
  }, [flat, count, engine]);

  // 빠르게 구간이 끝나 갈 때
  useEffect(() => {
    if (!flat?.length) return;
    const t = setInterval(() => {
      const s = engine.getSnapshot();
      if (s.status !== 'RUNNING' || !s.interval) return;
      const now = intervalNow(flat, s.interval.boundaries, { activeMs: activeMs(s, engine.now()), distanceM: s.distanceM });
      if (!now.step || near.current === now.index) return;
      const sentence = nearEndSentence(now.step);
      const r = now.remaining;
      const hit = r.kind === 'distance' ? r.m > 0 && r.m <= WORK_NEAR_END.distanceM : r.kind === 'time' ? r.sec > 0 && r.sec <= WORK_NEAR_END.sec : false;
      if (!sentence || !hit) return;
      near.current = now.index;
      speak(sentence);
    }, 1000);
    return () => clearInterval(t);
  }, [flat, engine]);
}
