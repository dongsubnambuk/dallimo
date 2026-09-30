import { segmentName, type CourseSegment } from '@/entities/ranking/types';
import { formatDurationSpoken } from '@/shared/format';

// 124장 Segment Attack 음성 문장. 목표는 내 구간 최고, 없으면 구간 1위

export type SegmentTarget = { sec: number; label: string; mine: boolean };

export function segmentTarget(s: CourseSegment | undefined): SegmentTarget | null {
  if (!s) return null;
  if (s.myBestSec != null) return { sec: s.myBestSec, label: '내 최고', mine: true };
  if (s.leader) return { sec: s.leader.timeSec, label: '구간 1위', mine: false };
  return null;
}

export function segmentStartSentence(s: CourseSegment, count: number): string {
  const t = segmentTarget(s);
  const head = `${segmentName(s.index)} 시작${count > 1 ? `, ${count}개 중 ${s.index + 1}번째` : ''}.`;
  return t ? `${head} ${t.label} ${formatDurationSpoken(t.sec)}.` : `${head} 첫 구간 기록을 남겨요.`;
}

export function segmentEndSentence(s: CourseSegment, sec: number): string {
  const head = `${segmentName(s.index)} 끝. ${formatDurationSpoken(sec)}.`;
  const parts = [head];
  if (s.myBestSec != null) {
    const d = sec - s.myBestSec;
    parts.push(d === 0 ? '내 최고와 같아요.' : `내 최고보다 ${formatDurationSpoken(d)} ${d < 0 ? '빨라요' : '느려요'}.`);
  }
  if (s.leader && s.leader.relation !== 'self' && sec < s.leader.timeSec) parts.push('구간 1위 기록보다 빨라요.');
  return parts.join(' ');
}
