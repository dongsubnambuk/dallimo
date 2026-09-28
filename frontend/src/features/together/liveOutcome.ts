import type { LiveResult, LiveResultEntry } from '@/entities/live/types';
import { formatDurationSpoken } from '@/shared/format';

// Live 결과 한 줄 요약 (TGT-011). 결과 화면 헤드라인과 공유 카드가 함께 쓴다.
// TOGETHER는 승패를 강조하지 않는다 (62.1장).
export function liveHeadline(r: LiveResult): { title: string; detail: string } {
  const me = r.entries.find((e) => e.isMe);
  const first = r.entries[0];
  const finished = r.entries.filter((e) => e.status === 'FINISHED').length;
  if (!me || me.status === 'DNF') return { title: '중도 포기했어요', detail: `${finished}명이 끝까지 달렸어요` };
  if (r.mode === 'TOGETHER') return { title: '함께 완주했어요', detail: `${r.entries.length}명이 같은 시간에 달렸어요` };
  if (me.rank === 1) return { title: '1위로 들어왔어요', detail: second(r) ?? '혼자 끝까지 달렸어요' };
  return { title: `${me.rank}위로 들어왔어요`, detail: behind(r, me, first) ?? '' };
}

function second(r: LiveResult) {
  const me = r.entries.find((e) => e.isMe);
  const s = r.entries.find((e) => e.rank === 2);
  if (!me || !s) return null;
  return r.mode === 'TIME_ATTACK' ? `2위 ${s.name}님보다 ${Math.round(me.distanceM - s.distanceM)}m 더 달렸어요` : `2위 ${s.name}님보다 ${formatDurationSpoken((s.timeSec ?? 0) - (me.timeSec ?? 0))} 빨랐어요`;
}

function behind(r: LiveResult, me: LiveResultEntry, first: LiveResultEntry) {
  return r.mode === 'TIME_ATTACK' ? `1위 ${first.name}님과 ${Math.round(first.distanceM - me.distanceM)}m 차이` : `1위 ${first.name}님과 ${formatDurationSpoken((me.timeSec ?? 0) - (first.timeSec ?? 0))} 차이`;
}

