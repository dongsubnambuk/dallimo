import type { LiveRoom } from '@/entities/live/types';
import { getPreferences } from '@/shared/preferences';
import { cancel, scheduleAt, scheduledIds } from '@/shared/notifications/notifier';

import { goalLabel } from './labels';

// 로컬 알림 (사용자 결정): 예약한 함께 달리기에 참가했으면 시작 10분 전에 휴대폰이 알린다.
// Push가 아니라 휴대폰에 예약해 인터넷 · Push 준비 없이도 울린다. 나가거나 방이 취소 · 시작되면 지운다.
// 설정 "함께 달리기"를 끄면 걸지 않는다.

const BEFORE_MS = 10 * 60_000;
const PREFIX = 'live-';
const idOf = (roomId: string) => `${PREFIX}${roomId}`;

function wanted(room: LiveRoom) {
  const me = room.members.find((m) => m.isMe);
  const joined = me && (me.status === 'JOINED' || me.status === 'READY');
  const waiting = room.status === 'WAITING' || room.status === 'READY';
  return getPreferences().pushLive && !!joined && waiting && room.scheduledAt != null && room.scheduledAt - BEFORE_MS > Date.now();
}

async function apply(room: LiveRoom) {
  if (!wanted(room)) return cancel(idOf(room.id));
  await scheduleAt(idOf(room.id), room.scheduledAt! - BEFORE_MS, '10분 뒤 함께 달리기', `${goalLabel(room)} · 대기실에서 준비해 주세요`, { link: `/together/${room.id}` }, 'default');
}

/** 방 하나 (대기실) */
export function syncLiveReminder(room: LiveRoom) {
  void apply(room).catch((e) => console.warn('[live] reminder', e));
}

/** 내 예정 방 전체 (함께 달리기 홈). 목록에 없는 방의 예약은 지운다 */
export function syncLiveReminders(rooms: LiveRoom[]) {
  void (async () => {
    await Promise.all(rooms.map(apply));
    const keep = new Set(rooms.map((r) => idOf(r.id)));
    for (const id of await scheduledIds()) if (id.startsWith(PREFIX) && !keep.has(id)) await cancel(id);
  })().catch((e) => console.warn('[live] reminders', e));
}
