import { dayLabel } from '@/features/my/labels';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** "방금" · "3시간 전" · "2일 전" · 일주일 넘으면 "9월 27일 (토)" */
export function agoLabel(at: number, now: number = Date.now()): string {
  const d = Math.max(0, now - at);
  if (d < HOUR) return '방금';
  if (d < DAY) return `${Math.floor(d / HOUR)}시간 전`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}일 전`;
  return dayLabel(new Date(at));
}
