import type { RunResult } from '@/entities/run/result';
import { formatDistanceKm, formatDurationSpoken } from '@/shared/format';

// 63.1장 1순위 "Finish 감정 피드백: 완주/PB/Challenge 성공 여부". 결과 맨 위 한 줄과 그 아래 설명.
export type Outcome = {
  kind: 'pb' | 'firstRecord' | 'won' | 'finished' | 'missed' | 'dnf' | 'free';
  headline: string;
  detail: string;
};

export function outcomeOf(r: RunResult): Outcome {
  if (!r.course) return { kind: 'free', headline: '자유 달리기 완료', detail: `${formatDistanceKm(r.distanceM)}km를 달렸어요` };
  const time = r.course.timeSec;
  if (time == null) return { kind: 'dnf', headline: '코스를 끝까지 달리지 못했어요', detail: '이번 기록은 러닝 기록으로만 남아요' };

  // 친구 기록 도전은 도전 결과가 먼저다 (63.1장 Challenge 성공 여부). PB도 세웠으면 설명에 붙인다
  if (r.mode === 'CHALLENGE' && r.target) {
    const diff = time - r.target.sec;
    const pb = r.pb?.improved ? (r.pb.previousSec == null ? ' · 첫 공식 기록' : ' · PB 갱신') : '';
    return diff <= 0
      ? { kind: 'won', headline: `${r.target.label} 기록을 넘었어요`, detail: (diff === 0 ? '기록이 똑같아요' : `${formatDurationSpoken(-diff)} 빨랐어요`) + pb }
      : { kind: 'missed', headline: `${r.target.label} 기록에 ${formatDurationSpoken(diff)} 모자랐어요`, detail: '코스는 끝까지 완주했어요' + pb };
  }

  // PB 판정(RST-002)은 서버가 검증된 기록으로 한다. 판정이 오기 전에는 목표 비교만 보여준다.
  if (r.pb?.improved) {
    return r.pb.previousSec == null
      ? { kind: 'firstRecord', headline: '첫 공식 기록', detail: '이 코스에 내 기록이 처음 올라갔어요' }
      : { kind: 'pb', headline: 'PB 갱신', detail: `이전 기록보다 ${formatDurationSpoken(r.pb.previousSec - time)} 빨랐어요` };
  }

  if (r.target) {
    const diff = time - r.target.sec;
    if (diff > 0) return { kind: 'missed', headline: '코스 완주', detail: `목표보다 ${formatDurationSpoken(diff)} 느렸어요` };
    return { kind: 'won', headline: '목표 달성', detail: diff === 0 ? '목표 기록과 똑같아요' : `목표보다 ${formatDurationSpoken(diff)} 빨랐어요` };
  }

  if (r.pb && r.pb.previousSec != null) {
    return { kind: 'finished', headline: '코스 완주', detail: `PB까지 ${formatDurationSpoken(time - r.pb.previousSec)} 남았어요` };
  }
  return { kind: 'finished', headline: '코스 완주', detail: '끝까지 완주했어요' };
}
