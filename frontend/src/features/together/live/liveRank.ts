import type { LiveMemberState, LiveMode, LiveRoom } from '@/entities/live/types';
import type { WatchPerson } from '@/features/watch/watchMessages';
import { formatDistanceKm } from '@/shared/format';

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

/** 나와 거리 차이. 예: "+72m"(나보다 앞), "−110m"(나보다 뒤) */
export function distanceGap(other: LiveMemberState, me: LiveMemberState): string {
  const d = Math.round(other.distanceM - me.distanceM);
  if (d === 0) return '0m';
  return `${d > 0 ? '+' : '−'}${Math.abs(d)}m`;
}

/** 워치 참가자 페이지 · 잠금 화면용 진행 상황 (결정 로그 83항). 순위 순서 그대로, 위치는 넣지 않는다 */
export function watchPeople(room: Pick<LiveRoom, 'targetDistanceM'>, ordered: LiveMemberState[]): WatchPerson[] {
  const target = room.targetDistanceM;
  return ordered.map((m) => ({
    name: m.isMe ? '나' : m.name,
    distanceKm: formatDistanceKm(m.distanceM),
    // 거리 목표가 없으면(타임 어택) 막대를 그리지 않는다
    progress: target ? Math.max(0, Math.min(1, m.status === 'FINISHED' ? 1 : m.distanceM / target)) : -1,
    me: m.isMe,
    status: m.status === 'FINISHED' ? 'finished' : m.status === 'DNF' ? 'dnf' : m.status === 'DISCONNECTED' ? 'away' : 'running',
  }));
}
