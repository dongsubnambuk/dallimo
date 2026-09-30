import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getRankingRepository } from '@/entities/ranking/api';
import type { CourseSegments } from '@/entities/ranking/types';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { activeMs, type RunningEngine } from '@/features/run/engine/runningEngine';
import { haptics } from '@/shared/haptics';
import { usePreferences } from '@/shared/preferences';
import { speak } from '@/shared/voice';

import { segmentEndSentence, segmentStartSentence } from './segmentCues';
import { INITIAL_SEGMENT_STATE, spansOf, stepSegments, type SegmentSpan, type SegmentTrackerState } from './segmentTracker';

export type SegmentAttack = {
  data: CourseSegments;
  spans: SegmentSpan[];
  state: SegmentTrackerState;
  // 방금 끝난 구간 (잠깐 보여 준다)
  justFinished: { index: number; sec: number } | null;
};

const FINISHED_SHOW_MS = 12_000;

/**
 * 124장 Segment Attack. 코스 러닝이면 구간(서버가 약 1km씩 나눈 것)과 내 최고 · 1위를 받아, 구간에 들어서면 음성으로 알리고
 * 구간이 끝나면 기록 · 비교를 읽고 진동한다(워치도). 인터벌 달리기 · 코스 없는 기록은 쓰지 않는다
 */
export function useSegmentAttack(engine: RunningEngine, courseId: string | null): SegmentAttack | null {
  const repo = useMemo(() => getRankingRepository('normal'), []);
  const query = useQuery({
    queryKey: ['ranking', 'segments', courseId],
    queryFn: () => repo.getSegments(courseId!),
    enabled: courseId != null,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const data = query.data && query.data.segments.length > 0 ? query.data : null;
  const spans = useMemo(() => (data ? spansOf(data.segments, data.courseLengthM) : []), [data]);
  const fraction = useRunSnapshot(engine, (s) => (s.course && s.course.lengthM > 0 ? Math.min(1, s.course.progressM / s.course.lengthM) : 0));
  const completedMs = useRunSnapshot(engine, (s) => s.course?.completedActiveMs ?? null);
  const voiceOn = usePreferences().voiceCompetition;
  const [state, setState] = useState<SegmentTrackerState>(INITIAL_SEGMENT_STATE);
  const [justFinished, setJustFinished] = useState<{ index: number; sec: number; at: number } | null>(null);
  const latest = useRef(state);

  useEffect(() => {
    if (!data || spans.length === 0) return;
    const r = stepSegments(latest.current, spans, fraction, activeMs(engine.getSnapshot(), engine.now()), completedMs);
    if (r.state === latest.current) return;
    latest.current = r.state;
    setState(r.state);
    for (const e of r.events) {
      const seg = data.segments[e.index];
      if (e.kind === 'start') {
        if (voiceOn && !r.state.active?.partial) speak(segmentStartSentence(seg, data.segments.length));
      } else {
        haptics.intervalStep();
        setJustFinished({ index: e.index, sec: e.sec, at: Date.now() });
        if (voiceOn) speak(segmentEndSentence(seg, e.sec));
      }
    }
  }, [data, spans, fraction, completedMs, engine, voiceOn]);

  useEffect(() => {
    if (!justFinished) return;
    const t = setTimeout(() => setJustFinished(null), FINISHED_SHOW_MS);
    return () => clearTimeout(t);
  }, [justFinished]);

  if (!data) return null;
  return { data, spans, state, justFinished: justFinished ? { index: justFinished.index, sec: justFinished.sec } : null };
}
