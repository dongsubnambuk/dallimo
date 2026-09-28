import { useEffect, useRef } from 'react';

import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import type { RunningEngine } from '@/features/run/engine/runningEngine';
import { formatDurationSpoken } from '@/shared/format';
import { usePreferences } from '@/shared/preferences';
import { speak } from '@/shared/voice';

// AUD-001 기본 음성 안내 · WBS 13 "구간 TTS 이벤트": 정한 거리(1km · 2km)마다 거리 · 누적 시간 · 평균 페이스를 짧게 읽는다.
// AUD-003 빈도는 설정(SCR-M07 "구간 안내")에서 고른다. 화면을 보지 않아도 진행을 알 수 있게 한다 (VISUAL-QA, NRC N8).
// 음성 안내를 끄면 shared/voice가 읽지 않는다.
export function useSplitAnnouncer(engine: RunningEngine) {
  // 배열 대신 개수만 구독해 구간이 늘 때만 다시 그린다 (CLAUDE.md 9항)
  const count = useRunSnapshot(engine, (s) => s.splits.length);
  const everyKm = usePreferences().voiceSplitKm;
  const announced = useRef(count);

  useEffect(() => {
    if (count <= announced.current) return;
    announced.current = count;
    if (everyKm === 0 || count % everyKm !== 0) return;
    speak(splitSentence(engine.getSnapshot().splits.map((s) => s.sec)));
  }, [count, everyKm, engine]);
}

/** 예: "2킬로미터. 10분 40초. 평균 페이스 5분 20초." (구간 시간 합 = 멈춘 시간을 뺀 누적 시간) */
export function splitSentence(splitSecs: number[]): string {
  const km = splitSecs.length;
  const total = splitSecs.reduce((a, b) => a + b, 0);
  return `${km}킬로미터. ${formatDurationSpoken(total)}. 평균 페이스 ${formatDurationSpoken(total / km)}.`;
}
