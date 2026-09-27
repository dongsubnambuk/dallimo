// 명세서 7.4장: API는 거리 meter 정수, 시간 second, 페이스 sec/km 정수로 주고 UI에서 표시 형식으로 바꾼다.
// 값이 없거나 계산할 수 없으면 51.2장대로 '--'를 쓴다.
export const EMPTY_VALUE = '--';

function isValid(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 3720 → "3.72" (km) */
export function formatDistanceKm(meters: number | null | undefined, fractionDigits = 2): string {
  if (!isValid(meters)) return EMPTY_VALUE;
  return (meters / 1000).toFixed(fractionDigits);
}

/** 1122 → "18:42", 3723 → "1:02:03" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!isValid(seconds)) return EMPTY_VALUE;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** 301 → "5'01\"" */
export function formatPace(secPerKm: number | null | undefined): string {
  if (!isValid(secPerKm) || secPerKm === 0) return EMPTY_VALUE;
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}'${pad2(total % 60)}"`;
}

/** 1234 → "1,234" */
export function formatCount(n: number | null | undefined): string {
  if (!isValid(n)) return EMPTY_VALUE;
  return Math.round(n).toLocaleString('ko-KR');
}

/** 8 → "8초", 72 → "1분 12초". 스크린 리더와 문장용. */
export function formatDurationSpoken(seconds: number): string {
  const total = Math.round(Math.abs(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}
