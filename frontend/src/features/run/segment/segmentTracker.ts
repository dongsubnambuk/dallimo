import type { CourseSegment } from '@/entities/ranking/types';

// 124장 Segment Attack: 달리는 동안 지금 어느 구간인지, 구간에 들어선 뒤 얼마나 걸렸는지 센다.
// 코스 위 진행(엔진 course.progressM)을 코스 길이 비율로 바꿔 서버 구간(courseLengthM 기준)과 맞춘다.
// 공식 구간 기록은 서버가 인증 뒤 GPS point로 다시 잰다. 여기서는 달리는 중 비교용이다.

export type SegmentSpan = { index: number; startF: number; endF: number };

export type ActiveSegment = {
  index: number;
  // 들어선 때의 달린 시간(ms)
  startMs: number;
  // 구간 처음부터 재지 못했으면(이어 달리기 · 중간에서 시작) 비교하지 않는다
  partial: boolean;
};

export type FinishedSegment = { index: number; sec: number };

export type SegmentTrackerState = { active: ActiveSegment | null; finished: FinishedSegment[]; ended: boolean };

export type SegmentEvent = { kind: 'start'; index: number } | { kind: 'end'; index: number; sec: number };

export const INITIAL_SEGMENT_STATE: SegmentTrackerState = { active: null, finished: [], ended: false };

export function spansOf(segments: CourseSegment[], courseLengthM: number): SegmentSpan[] {
  if (courseLengthM <= 0) return [];
  return segments.map((s) => ({ index: s.index, startF: s.startM / courseLengthM, endF: s.endM / courseLengthM }));
}

function indexAt(spans: SegmentSpan[], f: number): number {
  for (const s of spans) if (f < s.endF) return s.index;
  return spans.length - 1;
}

/**
 * 진행 비율 f(0~1)와 달린 시간(ms)으로 한 걸음. completedMs: 코스 끝에 닿은 달린 시간(있으면 마지막 구간을 그 시각으로 닫는다).
 * 첫 값이 0보다 크면(이어 달리기) 그 구간은 partial이다. 구간 경계를 넘으면 앞 구간을 닫고 다음 구간을 연다
 */
export function stepSegments(
  state: SegmentTrackerState,
  spans: SegmentSpan[],
  f: number,
  ms: number,
  completedMs: number | null,
): { state: SegmentTrackerState; events: SegmentEvent[] } {
  if (spans.length === 0 || state.ended) return { state, events: [] };
  const events: SegmentEvent[] = [];
  let { active, finished } = state;
  const close = (at: number) => {
    if (!active) return;
    if (!active.partial) {
      const sec = Math.max(0, Math.round((at - active.startMs) / 1000));
      finished = [...finished, { index: active.index, sec }];
      events.push({ kind: 'end', index: active.index, sec });
    }
    active = null;
  };

  if (completedMs != null) {
    close(completedMs);
    return { state: { active: null, finished, ended: true }, events };
  }
  if (!active) {
    if (f <= 0) return { state, events };
    const index = indexAt(spans, f);
    // 첫 구간은 출발(진행 0)부터 잰다. 다른 구간 한가운데서 시작하면 비교하지 않는다
    const partial = !(index === 0 && finished.length === 0 && f < spans[0].endF * 0.25);
    active = { index, startMs: ms, partial };
    events.push({ kind: 'start', index });
    return { state: { active, finished, ended: false }, events };
  }
  const index = indexAt(spans, f);
  if (index > active.index) {
    const from = active.index;
    close(ms);
    // 한 번에 여러 구간을 건너뛰면(신호 끊김) 건너뛴 구간은 재지 않는다
    active = { index, startMs: ms, partial: index !== from + 1 };
    events.push({ kind: 'start', index });
  }
  return { state: { active, finished, ended: false }, events };
}

/** 구간 목표와 차이(초, + 느림). 구간을 50m 넘게 달리기 전이면 null */
export function segmentGapSec(span: SegmentSpan, courseLengthM: number, f: number, elapsedSec: number, targetSec: number): number | null {
  const len = (span.endF - span.startF) * courseLengthM;
  const done = (f - span.startF) * courseLengthM;
  if (len <= 0 || done < 50) return null;
  return elapsedSec - targetSec * Math.min(1, done / len);
}
