import { distanceM, type GeoPoint } from '@/shared/geo';

import type { RunMode } from './types';
import type { RunPolicy } from './policy';

// RUN-009 자동 일시정지. 멈춰 선 것을 감지하면 기록을 멈추고, 다시 달리면 이어서 기록한다.
// 기준값(속도 · 시간)은 20.2장 "필드 테스트"에서 정할 항목이라 RunPolicy의 시작값을 쓴다 (FOUNDATION-DECISION-LOG 40항).

// 자동 일시정지를 쓰는 모드. 함께 달리기 · 레이스 · 타임 어택은 모두가 같은 시계로 달려서 쓰지 않는다.
// 인터벌 달리기는 천천히 걷거나 서서 쉬는 구간의 시간도 세야 해서 쓰지 않는다 (FOUNDATION-DECISION-LOG 45항)
const AUTO_PAUSE_MODES: readonly RunMode[] = ['FREE', 'COURSE', 'PB', 'CHALLENGE'];

export function autoPauseAvailable(mode: RunMode) {
  return AUTO_PAUSE_MODES.includes(mode);
}

export type AutoPauseSample = GeoPoint & {
  // 기기가 준 속도(m/s). 없으면 위치 변화로 계산한다
  speed: number | null;
  accuracy: number | null;
  // epoch ms
  timestamp: number;
};

export type AutoPauseState = {
  // 느린 상태가 시작된 시각. 달리는 중이면 null
  slowSince: number | null;
  // 빠른 상태가 시작된 시각 (자동 일시정지 중일 때만 본다)
  fastSince: number | null;
  // 속도를 모를 때 위치 변화로 계산하는 최근 표본
  recent: AutoPauseSample[];
};

export const initialAutoPause = (): AutoPauseState => ({ slowSince: null, fastSince: null, recent: [] });

// 속도를 모를 때 이만큼의 시간 동안 움직인 거리로 속도를 본다 (한 번 튄 위치로 판단하지 않게)
const WINDOW_MS = 5_000;

export type AutoPauseAction =
  // at: 멈춘 것으로 보는 시각. 멈춰 선 시간은 달린 시간에 넣지 않는다
  | { kind: 'pause'; at: number }
  | { kind: 'resume'; at: number }
  | null;

/**
 * 위치 하나를 받아 다음 상태와 할 일을 돌려준다.
 * paused: 지금 자동 일시정지 중인지. 사용자가 직접 멈춘 경우에는 부르지 않는다.
 */
export function stepAutoPause(state: AutoPauseState, sample: AutoPauseSample, paused: boolean, policy: RunPolicy): { state: AutoPauseState; action: AutoPauseAction } {
  // 정확도가 나쁜 위치로는 판단하지 않는다
  if (sample.accuracy == null || sample.accuracy > policy.gpsRequiredAccuracyM) return { state, action: null };
  const recent = [...state.recent.filter((s) => sample.timestamp - s.timestamp <= WINDOW_MS && s.timestamp < sample.timestamp), sample];
  const speed = speedOf(sample, recent);
  const next: AutoPauseState = { ...state, recent };
  if (speed == null) return { state: next, action: null };

  const t = sample.timestamp;
  if (!paused) {
    next.fastSince = null;
    if (speed >= policy.autoPauseStopMps) return { state: { ...next, slowSince: null }, action: null };
    const since = state.slowSince ?? t;
    if (t - since >= policy.autoPauseStopSec * 1000) return { state: { ...next, slowSince: null }, action: { kind: 'pause', at: since } };
    return { state: { ...next, slowSince: since }, action: null };
  }

  next.slowSince = null;
  if (speed < policy.autoPauseResumeMps) return { state: { ...next, fastSince: null }, action: null };
  const since = state.fastSince ?? t;
  if (t - since >= policy.autoPauseResumeSec * 1000) return { state: { ...next, fastSince: null, recent: [] }, action: { kind: 'resume', at: t } };
  return { state: { ...next, fastSince: since }, action: null };
}

function speedOf(sample: AutoPauseSample, recent: AutoPauseSample[]): number | null {
  if (sample.speed != null && sample.speed >= 0) return sample.speed;
  const first = recent[0];
  const sec = (sample.timestamp - first.timestamp) / 1000;
  // 표본이 너무 짧으면 모른다
  if (sec < 2) return null;
  return distanceM(first, sample) / sec;
}
