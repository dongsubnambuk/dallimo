import { segmentName } from '@/entities/ranking/types';
import { formatDuration } from '@/shared/format';

import { segmentTarget } from './segmentCues';
import { segmentGapSec } from './segmentTracker';
import type { SegmentAttack } from './useSegmentAttack';

export type SegmentLine = { label: string; value: string; note: string | null; tone: 'accent' | 'warning' | 'neutral' };

/**
 * 지금 구간 한 줄 (휴대폰 배너 · 워치 한 줄). fraction: 코스 진행 비율, sec: 달린 시간(초).
 * 방금 끝난 구간이 있으면 그 기록과 비교, 구간 안이면 목표(내 최고, 없으면 1위)와 지금 차이
 */
export function segmentLine(attack: SegmentAttack, fraction: number, sec: number): SegmentLine | null {
  const { data, spans, state, justFinished } = attack;
  const count = data.segments.length;
  let line: SegmentLine | null = null;
  if (justFinished) {
    const seg = data.segments[justFinished.index];
    const d = seg.myBestSec != null ? justFinished.sec - seg.myBestSec : null;
    const beatLeader = seg.leader != null && seg.leader.relation !== 'self' && justFinished.sec < seg.leader.timeSec;
    line = {
      label: `${segmentName(seg.index)} 기록`,
      value: formatDuration(justFinished.sec),
      note: [d == null ? '첫 구간 기록' : d < 0 ? `내 최고보다 ${formatDuration(-d)} 빨라요` : d > 0 ? `내 최고보다 ${formatDuration(d)} 느려요` : '내 최고와 같아요', beatLeader ? '구간 1위 기록보다 빨라요' : null]
        .filter(Boolean)
        .join(' · '),
      tone: d == null || d <= 0 || beatLeader ? 'accent' : 'neutral',
    };
  } else if (state.active) {
    const seg = data.segments[state.active.index];
    const span = spans[state.active.index];
    const remaining = Math.max(0, Math.round((span.endF - fraction) * data.courseLengthM));
    const target = segmentTarget(seg);
    const elapsed = Math.max(0, sec - Math.floor(state.active.startMs / 1000));
    const gap = !state.active.partial && target ? segmentGapSec(span, data.courseLengthM, fraction, elapsed, target.sec) : null;
    const rounded = gap == null ? null : Math.round(gap);
    line = {
      label: `${segmentName(seg.index)} 도전 · ${seg.index + 1}/${count}`,
      value: state.active.partial ? '비교 없음' : rounded == null ? formatDuration(elapsed) : rounded === 0 ? '같아요' : `${formatDuration(Math.abs(rounded))} ${rounded < 0 ? '빨라요' : '느려요'}`,
      note: [target && !state.active.partial ? `${target.label} ${formatDuration(target.sec)}` : state.active.partial ? '구간 처음부터 재지 못했어요' : '첫 구간 기록을 남겨요', `${remaining}m 남음`].join(' · '),
      tone: rounded == null || rounded === 0 ? 'neutral' : rounded < 0 ? 'accent' : 'warning',
    };
  }
  return line;
}
