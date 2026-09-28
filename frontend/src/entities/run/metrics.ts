import { distanceM } from '@/shared/geo';

import type { RunPolicy } from './policy';
import type { RunPoint, RunSplit } from './types';

// 51장 GPS 계산 파이프라인 중 화면 지표 부분: accepted segment → distance accumulator → pace window.
// 원본 Point는 RunPointStore에 그대로 남기고, 여기서는 지표 계산에 쓸지 말지만 판단한다.
// 정확도 · 순간 이동 판정은 저장할 때 recorder가 qualityFlag로 붙인다. 여기서는 OK가 아닌 point를 거리에서 빼고 앞뒤를 잇지 않는다.
export type MetricsState = {
  distanceM: number;
  // 마지막으로 받은 accepted point. 일시정지 뒤에는 null로 끊어 멈춘 동안의 이동을 세지 않는다.
  last: RunPoint | null;
  // 현재 페이스용 최근 구간 [끝 시각 ms, 거리 m, 시간 ms]
  window: { at: number; dM: number; dtMs: number }[];
  splits: RunSplit[];
  // 직전 스플릿이 끝난 시점의 active 경과(ms)
  splitStartActiveMs: number;
};

export const initialMetrics = (): MetricsState => ({ distanceM: 0, last: null, window: [], splits: [], splitStartActiveMs: 0 });

/** point 하나를 반영한 새 상태. activeMs는 이 point 시점의 active 경과(일시정지 제외). */
export function addPoint(state: MetricsState, p: RunPoint, activeMs: number, policy: RunPolicy): MetricsState {
  if (p.qualityFlag !== 'OK') {
    // 정확도가 낮은 point는 거리에 넣지 않고, 다음 좋은 point와도 잇지 않는다 (튄 구간을 건너뛴다)
    return { ...state, last: null };
  }
  if (!state.last || p.recordedAt <= state.last.recordedAt) return { ...state, last: p };

  const dM = distanceM(state.last, p);
  const dtMs = p.recordedAt - state.last.recordedAt;
  const distance = state.distanceM + dM;
  const cutoff = p.recordedAt - policy.currentPaceWindowSec * 1000;
  const window = [...state.window, { at: p.recordedAt, dM, dtMs }].filter((s) => s.at > cutoff);

  let splits = state.splits;
  let splitStartActiveMs = state.splitStartActiveMs;
  const doneKm = Math.floor(distance / 1000);
  if (doneKm > splits.length) {
    // 1km 경계를 넘은 시점을 구간 안에서 비율로 나눠 추정한다
    const over = distance - doneKm * 1000;
    const crossActiveMs = activeMs - (dM > 0 ? (over / dM) * dtMs : 0);
    splits = [...splits, { km: doneKm, sec: Math.round((crossActiveMs - splitStartActiveMs) / 1000) }];
    splitStartActiveMs = crossActiveMs;
  }

  return { distanceM: distance, last: p, window, splits, splitStartActiveMs };
}

/** 일시정지·재개 때 현재 페이스 창과 이어 붙일 point를 끊는다 (51.2장) */
export function breakSegment(state: MetricsState): MetricsState {
  return { ...state, last: null, window: [] };
}

/** 평균 페이스(초/km) = active elapsed / accepted distance. 표본이 부족하면 null('--'). */
export function averagePace(state: MetricsState, activeMs: number, policy: RunPolicy): number | null {
  if (state.distanceM < policy.minPaceSampleM) return null;
  return activeMs / 1000 / (state.distanceM / 1000);
}

/** 현재 페이스(초/km): 최근 accepted 구간의 거리/시간. 표본이 부족하면 null. */
export function currentPace(state: MetricsState, policy: RunPolicy): number | null {
  const dM = state.window.reduce((a, s) => a + s.dM, 0);
  const dtMs = state.window.reduce((a, s) => a + s.dtMs, 0);
  if (dM < policy.minPaceSampleM / 2 || dtMs <= 0) return null;
  return dtMs / 1000 / (dM / 1000);
}
