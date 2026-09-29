import { useEffect } from 'react';

import { targetGapSec } from '@/entities/run/courseProgress';
import { getRunPolicySync } from '@/entities/run/policy';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { activeMs, type ActiveRunSnapshot, type RunningEngine } from '@/features/run/engine/runningEngine';
import { usePreferences } from '@/shared/preferences';
import { speak } from '@/shared/voice';

import { createGapVoice, gapSentence } from './competitionRules';

export type VoiceTarget = { sec: number; label: string };

// PB 어택은 "목표", 도전은 "민수님 기록"처럼 읽는다
export function targetLabel(mode: ActiveRunSnapshot['mode'], target: VoiceTarget) {
  return mode === 'CHALLENGE' ? `${target.label}님 기록` : '목표';
}

/** 지금 목표와의 차이(초, + 뒤처짐). 코스 진행이 짧거나 완주했으면 null (ModeStrip GapStrip과 같은 계산) */
export function gapNow(s: ActiveRunSnapshot, now: number, targetSec: number): number | null {
  const c = s.course;
  if (!c || c.completedActiveMs != null || c.progressM < getRunPolicySync().minPaceSampleM) return null;
  // 화면(useElapsedSec)처럼 초 아래는 버려 읽는 값과 보이는 값을 맞춘다
  return targetGapSec(c.progressM, c.lengthM, Math.floor(activeMs(s, now) / 1000), targetSec);
}

/**
 * AUD-002 PB 어택 · 도전: 목표보다 앞섰다가 뒤처지거나 그 반대가 되면 읽는다 (1초마다 확인).
 * 설정 "경쟁 안내"를 끄거나 음성 안내를 끄면 읽지 않는다.
 */
export function useGapVoice(engine: RunningEngine, target: VoiceTarget | null) {
  const on = usePreferences().voiceCompetition;
  const mode = useRunSnapshot(engine, (s) => s.mode);
  const active = on && target != null && (mode === 'PB' || mode === 'CHALLENGE');
  const sec = target?.sec ?? 0;
  const label = target ? targetLabel(mode, target) : '';
  useEffect(() => {
    if (!active) return;
    const rule = createGapVoice(label);
    const t = setInterval(() => {
      const s = engine.getSnapshot();
      if (s.status !== 'RUNNING') return;
      const line = rule(engine.now(), gapNow(s, engine.now(), sec));
      if (line) speak(line);
    }, 1000);
    return () => clearInterval(t);
  }, [active, label, sec, engine]);
}

/** 구간 안내 끝에 붙일 목표 차이 한 문장 (PB 어택 · 도전, 경쟁 안내를 켰을 때) */
export function useGapLine(engine: RunningEngine, target: VoiceTarget | null): (() => string | null) | undefined {
  const on = usePreferences().voiceCompetition;
  const mode = useRunSnapshot(engine, (s) => s.mode);
  if (!on || !target || (mode !== 'PB' && mode !== 'CHALLENGE')) return undefined;
  return () => {
    const gap = gapNow(engine.getSnapshot(), engine.now(), target.sec);
    return gap == null ? null : gapSentence(gap, targetLabel(mode, target));
  };
}
