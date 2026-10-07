// 날짜 · 거리 · 페이스 표시. 시간은 한국 시간으로

const DATE_TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATE = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

export function dateTime(iso: string | null | undefined): string {
  return iso ? DATE_TIME.format(new Date(iso)) : '-';
}

export function date(iso: string | null | undefined): string {
  return iso ? DATE.format(new Date(iso)) : '-';
}

/** "3분 전" · "2일 전". 30일 넘으면 날짜 */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '-';
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}일 전`;
  return date(iso);
}

export function km(m: number): string {
  return `${(m / 1000).toFixed(m >= 100_000 ? 0 : 2)} km`;
}

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function pace(secPerKm: number | null): string {
  if (!secPerKm) return '-';
  return `${Math.floor(secPerKm / 60)}'${String(secPerKm % 60).padStart(2, '0')}"`;
}
