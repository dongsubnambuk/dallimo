import type { LiveMemberStatus, LiveMode } from '@/entities/live/types';
import type { ParticipantStatus } from '@/components/ParticipantChip';
import type { IconName } from '@/design/primitives';
import { formatDistanceKm } from '@/shared/format';

// 45.1장 모드. 사용자에게는 목적 중심 이름으로 보여준다.
export const MODE_INFO: Record<LiveMode, { title: string; caption: string; icon: IconName }> = {
  LIVE_RACE: { title: '레이스', caption: '먼저 도착하면 승리', icon: 'trophy' },
  TIME_ATTACK: { title: '타임 어택', caption: '시간 안에 더 멀리', icon: 'time' },
  TOGETHER: { title: '함께', caption: '승패 없이 같이', icon: 'modeTogether' },
};

/** 목표 값만. 예: "10km", "30분" (모드 이름은 배지로 따로 보여줄 때) */
export function goalValue(r: { targetDistanceM: number | null; targetSeconds: number | null }) {
  return r.targetSeconds != null ? `${Math.round(r.targetSeconds / 60)}분` : `${formatDistanceKm(r.targetDistanceM ?? 0, r.targetDistanceM && r.targetDistanceM % 1000 === 0 ? 0 : 2)}km`;
}

export function goalLabel(r: { mode: LiveMode; targetDistanceM: number | null; targetSeconds: number | null }) {
  const goal = goalValue(r);
  return r.mode === 'TOGETHER' ? `함께 ${goal}` : `${goal} ${MODE_INFO[r.mode].title}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 1인칭 시작 시각. null이면 모두 준비되면 시작. 예: "오늘 20:00 · 1시간 58분 뒤" */
export function startLabel(scheduledAt: number | null, now = Date.now()) {
  if (scheduledAt == null) return '모두 준비되면 시작';
  const d = new Date(scheduledAt);
  const today = new Date(now);
  const dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  const day = dayDiff === 0 ? '오늘' : dayDiff === 1 ? '내일' : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const left = scheduledAt - now;
  // 분으로 먼저 반올림해야 "2시간 60분"이 되지 않는다
  const mins = Math.round(left / 60_000);
  const rel = left <= 60_000 ? '곧' : left < 3_600_000 ? `${Math.ceil(left / 60_000)}분 뒤` : mins % 60 === 0 ? `${mins / 60}시간 뒤` : `${Math.floor(mins / 60)}시간 ${mins % 60}분 뒤`;
  return `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())} · ${rel}`;
}

export function agoLabel(ts: number, now = Date.now()) {
  const days = Math.floor((now - ts) / 86_400_000);
  return days <= 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

// 6.3장 LiveMemberStatus → ParticipantChip 상태
export function participantStatus(s: LiveMemberStatus): ParticipantStatus {
  switch (s) {
    case 'INVITED':
      return 'invited';
    case 'JOINED':
      return 'waiting';
    case 'READY':
      return 'ready';
    case 'RUNNING':
      return 'running';
    case 'FINISHED':
      return 'finished';
    case 'DNF':
      return 'dnf';
    case 'DISCONNECTED':
      return 'disconnected';
  }
}
