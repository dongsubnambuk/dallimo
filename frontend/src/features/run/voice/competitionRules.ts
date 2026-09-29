import { formatDurationSpoken } from '@/shared/format';

// AUD-002 경쟁 음성 안내 (WBS 13 "경쟁 TTS 이벤트"). 69장: PB gap은 "임계치 통과 시 선택적 TTS", 순위 변화는 가벼운 햅틱과 함께.
// 러닝 중 소리가 너무 잦지 않게 바뀐 순간만, 최소 간격을 두고 읽는다. 값은 명세에 없어 정한 시작값 (FOUNDATION-DECISION-LOG 44항).

// 목표와 이만큼(초) 넘게 차이가 나야 앞섬 · 뒤처짐으로 본다 (그 사이는 이전 상태 유지)
export const GAP_THRESHOLD_SEC = 3;
// 앞섬 · 뒤처짐 안내 최소 간격
export const GAP_MIN_INTERVAL_MS = 60_000;
// 순위가 이만큼 유지돼야 읽는다 (잠깐 엎치락뒤치락은 읽지 않는다)
export const RANK_STABLE_MS = 5_000;
export const RANK_MIN_INTERVAL_MS = 20_000;
// 타임 어택 남은 시간 안내 (초)
export const REMAINING_MARKS_SEC = [300, 60];

/** "목표보다 5초 빨라요" · "민수님 기록보다 12초 느려요" · "목표와 같아요". gapSec: + 뒤처짐, − 앞섬 */
export function gapSentence(gapSec: number, label: string): string {
  const s = Math.round(gapSec);
  if (s === 0) return `${label}와 같아요`;
  return `${label}보다 ${formatDurationSpoken(Math.abs(s))} ${s < 0 ? '빨라요' : '느려요'}`;
}

type Side = 'ahead' | 'behind';

/** PB · 도전: 목표보다 앞섰다가 뒤처지거나 그 반대가 되면 한 번 읽는다. 처음 정해지는 쪽은 읽지 않는다 */
export function createGapVoice(label: string) {
  let side: Side | null = null;
  let lastAt = -Infinity;
  return (now: number, gapSec: number | null): string | null => {
    if (gapSec == null) return null;
    const next: Side | null = gapSec >= GAP_THRESHOLD_SEC ? 'behind' : gapSec <= -GAP_THRESHOLD_SEC ? 'ahead' : side;
    if (next === side || next == null) return null;
    const first = side == null;
    side = next;
    if (first || now - lastAt < GAP_MIN_INTERVAL_MS) return null;
    lastAt = now;
    return next === 'ahead' ? `다시 앞섰어요. ${gapSentence(gapSec, label)}` : `뒤처졌어요. ${gapSentence(gapSec, label)}`;
  };
}

/** 레이스 · 타임 어택: 순위가 RANK_STABLE_MS 유지되면 "2위로 올라섰어요" · "3위로 내려갔어요". 처음 순위는 읽지 않는다 */
export function createRankVoice() {
  let announced: number | null = null;
  let pending: { rank: number; since: number } | null = null;
  let lastAt = -Infinity;
  return (now: number, rank: number | null): string | null => {
    if (rank == null) return null;
    if (announced == null) {
      announced = rank;
      return null;
    }
    if (rank === announced) {
      pending = null;
      return null;
    }
    if (!pending || pending.rank !== rank) pending = { rank, since: now };
    if (now - pending.since < RANK_STABLE_MS || now - lastAt < RANK_MIN_INTERVAL_MS) return null;
    const up = rank < announced;
    announced = rank;
    pending = null;
    lastAt = now;
    return rank === 1 ? '1위로 올라섰어요' : `${rank}위로 ${up ? '올라섰어요' : '내려갔어요'}`;
  };
}

/** 타임 어택 남은 시간: 5분 · 1분 전에 한 번씩 */
export function createRemainingVoice(marks: number[] = REMAINING_MARKS_SEC) {
  const done = new Set<number>();
  return (remainingSec: number | null): string | null => {
    if (remainingSec == null) return null;
    const mark = marks.find((m) => remainingSec <= m && remainingSec > m - 30 && !done.has(m));
    if (mark == null) return null;
    // 지난 표시는 다시 읽지 않는다 (앱이 늦게 켜져도 한 번만)
    marks.filter((m) => m >= mark).forEach((m) => done.add(m));
    return `남은 시간 ${formatDurationSpoken(mark)}`;
  };
}

/** 함께 달리기 · 레이스: 다른 참가자가 완주하면. 레이스는 첫 완주만 "선두", 함께 달리기는 모두 */
export function createFinishVoice(race: boolean) {
  const seen = new Set<string>();
  let first = true;
  return (members: { userId: string; name: string; isMe: boolean; finished: boolean }[]): string | null => {
    const lines: string[] = [];
    for (const m of members) {
      if (!m.finished || m.isMe || seen.has(m.userId)) continue;
      seen.add(m.userId);
      if (race) {
        if (first) lines.push(`선두 ${m.name}님이 완주했어요`);
      } else lines.push(`${m.name}님이 완주했어요`);
      first = false;
    }
    // 내가 먼저 끝냈으면 레이스 "선두" 안내는 없다
    if (members.some((m) => m.isMe && m.finished)) first = false;
    return lines.length ? lines.join('. ') : null;
  };
}
