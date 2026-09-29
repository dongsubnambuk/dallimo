import { advanceInterval, closeInterval, initialIntervalTrack, nextIntervalStep, type IntervalSample, type IntervalTrack } from '@/entities/workout/tracker';
import type { FlatStep, StepBoundary } from '@/entities/workout/types';

// 엔진 안의 인터벌 구간 판정 (mock · 실제 엔진이 같이 쓴다). 구간이 끝날 때마다 onChange로 알린다 (화면 · 기기 저장).
export type IntervalTracking = {
  readonly active: boolean;
  boundaries(): StepBoundary[];
  // 앱이 꺼졌다 켜질 때 저장한 경계를 되살린다 (지난 point를 다시 넣기 전에)
  restore(boundaries: StepBoundary[]): void;
  // point마다 · 1초마다
  sample(s: IntervalSample): void;
  // 직접 넘기는 구간의 "다음 구간"
  next(s: IntervalSample): void;
  // 달리기를 끝낼 때 하던 구간을 닫는다
  close(s: IntervalSample): void;
};

export function createIntervalTracking(flat: FlatStep[] | null, onChange: (boundaries: StepBoundary[]) => void): IntervalTracking {
  let track: IntervalTrack = initialIntervalTrack();
  const apply = (next: IntervalTrack) => {
    const changed = next.boundaries.length !== track.boundaries.length;
    track = next;
    if (changed) onChange(track.boundaries);
  };
  return {
    active: flat != null && flat.length > 0,
    boundaries: () => track.boundaries,
    restore(boundaries) {
      track = { boundaries: [...boundaries], last: null };
    },
    sample(s) {
      if (flat?.length) apply(advanceInterval(flat, track, s));
    },
    next(s) {
      if (flat?.length) apply(nextIntervalStep(flat, track, s));
    },
    close(s) {
      if (flat?.length) apply(closeInterval(flat, track, s));
    },
  };
}

/** 기기에 저장한 경계 JSON. 틀리면 빈 목록 */
export function parseBoundaries(json: string | null | undefined): StepBoundary[] {
  if (!json) return [];
  try {
    const list = JSON.parse(json) as StepBoundary[];
    return Array.isArray(list) ? list.filter((b) => Number.isFinite(b?.activeMs) && Number.isFinite(b?.distanceM)).map((b) => ({ ...b, completed: b.completed !== false })) : [];
  } catch {
    return [];
  }
}
