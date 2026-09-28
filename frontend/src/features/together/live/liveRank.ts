import type { LiveMemberState, LiveMode } from '@/entities/live/types';

// 러닝 중 화면용 순위. 최종 순위는 서버 finalization 값을 쓴다 (46.1장).
// 레이스: 완주한 사람(기록 순) → 달리는 사람(거리 순). 타임 어택: 거리 순. 중도 포기는 맨 뒤.
export function orderMembers(mode: LiveMode, members: LiveMemberState[]): LiveMemberState[] {
  return [...members].sort((a, b) => {
    const dnf = (m: LiveMemberState) => (m.status === 'DNF' ? 1 : 0);
    if (dnf(a) !== dnf(b)) return dnf(a) - dnf(b);
    if (mode === 'LIVE_RACE') {
      const fa = a.finishSec ?? Infinity;
      const fb = b.finishSec ?? Infinity;
      if (fa !== fb) return fa - fb;
    }
    return b.distanceM - a.distanceM;
  });
}

export function myRank(mode: LiveMode, members: LiveMemberState[]): number | null {
  if (mode === 'TOGETHER') return null;
  const i = orderMembers(mode, members).findIndex((m) => m.isMe);
  return i < 0 ? null : i + 1;
}

/** 나와 거리 차이. 예: "+72m"(나보다 앞), "−110m"(나보다 뒤) */
export function distanceGap(other: LiveMemberState, me: LiveMemberState): string {
  const d = Math.round(other.distanceM - me.distanceM);
  if (d === 0) return '0m';
  return `${d > 0 ? '+' : '−'}${Math.abs(d)}m`;
}
