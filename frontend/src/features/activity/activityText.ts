import type { Activity } from '@/entities/activity/types';
import { formatDistanceKm, formatDuration, formatDurationSpoken } from '@/shared/format';

// 활동 한 줄 문구 (SCR-M06). 제목은 누가 무엇을 했는지, 설명은 코스와 숫자.
export function activityText(a: Activity): { title: string; detail: string } {
  const who = a.isMine ? '내가' : `${a.nickname}님이`;
  const course = a.course.name;
  const time = a.timeSec != null ? formatDuration(a.timeSec) : null;
  switch (a.type) {
    case 'PB':
      if (a.previousSec == null) return { title: `${who} 첫 공식 기록을 남겼어요`, detail: join(course, time) };
      return {
        title: `${who} PB를 세웠어요`,
        detail: join(course, time && a.timeSec != null ? `${time} (${formatDurationSpoken(a.previousSec - a.timeSec)} 단축)` : time),
      };
    case 'WEEKLY_TOP':
      return { title: `${who} 이번 주 ${a.rank}위에 올랐어요`, detail: join(course, time) };
    case 'CHALLENGE_WON': {
      const whose = a.target?.isMe ? '내' : a.target ? `${a.target.nickname}님` : '친구';
      const target = a.target ? `목표 ${formatDuration(a.target.timeSec)}` : null;
      return { title: `${who} ${whose} 기록을 넘었어요`, detail: join(course, time && target ? `${time} (${target})` : time) };
    }
    case 'COURSE_CREATED':
      return { title: `${who} 새 코스를 만들었어요`, detail: join(course, `${formatDistanceKm(a.course.distanceM, 1)}km`) };
  }
}

const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ');
