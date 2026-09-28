import type { CourseDetail } from '@/entities/course/types';
import type { LiveResult } from '@/entities/live/types';
import type { RunResult } from '@/entities/run/result';
import { goalLabel, MODE_INFO } from '@/features/together/labels';
import { liveHeadline } from '@/features/together/liveOutcome';
import { outcomeOf } from '@/features/run-result/outcome';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import { formatDistanceKm, formatDuration, formatDurationSpoken, formatPace } from '@/shared/format';
import type { GeoPoint } from '@/shared/geo';
import { withWaGwa } from '@/shared/korean';

// SCR-R05 공유 카드 템플릿 (SHR-001, 67.1장 ShareTemplateCard: map, record, ranking, battle)
export type TemplateKey = 'map' | 'record' | 'ranking' | 'battle';

export const TEMPLATE_LABEL: Record<TemplateKey, string> = { map: '지도', record: '기록', ranking: '순위', battle: '대결' };

type Stat = { label: string; value: string; unit?: string };

// 카드에 그릴 값. 화면 모델(RunResult · LiveResult)을 카드용 문구로 한 번에 바꿔 둔다.
export type ShareCardData = {
  title: string;
  context: string;
  date: string;
  nickname: string;
  headline: string;
  // PB · 목표 달성 · 1위처럼 강조할 결과
  highlight: boolean;
  primary: Stat;
  stats: Stat[];
  // 서버 검증을 통과한 기록만 "공식 기록"이라고 쓴다
  verified: boolean;
  path: GeoPoint[];
  course: GeoPoint[] | null;
  // 코스 없는 기록: 지도에 출발 지점이 그대로 보인다 (16장 privacy zone 검토 전)
  freePath: boolean;
  ranking: { label: string; before: number | null; after: number } | null;
  battle: { rows: { name: string; value: string; me: boolean; rank: number | null }[]; caption: string } | null;
};

function dateOf(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

export function fromRun(r: RunResult, course: CourseDetail | null, nickname: string): ShareCardData {
  const o = outcomeOf(r);
  const courseTime = r.course?.timeSec ?? null;
  const verified = r.verification === 'verified';
  const distance: Stat = { label: '거리', value: formatDistanceKm(courseTime != null && course ? course.distanceM : r.distanceM), unit: 'km' };
  const pace: Stat = { label: '평균 페이스', value: formatPace(courseTime != null && course ? courseTime / (course.distanceM / 1000) : r.avgPaceSec), unit: '/km' };
  const time: Stat = { label: courseTime != null ? '코스 기록' : '시간', value: formatDuration(courseTime ?? r.activeSec) };

  // PB 어택 · 라이벌: 나와 목표 기록을 나란히 (완주한 기록만)
  let battle: ShareCardData['battle'] = null;
  if (r.target && courseTime != null) {
    const diff = courseTime - r.target.sec;
    // PB 어택 목표는 "내 PB −10초"처럼 PB에서 만든 값이라 '목표 기록'이라고 부른다
    const who = r.mode === 'PB' ? '목표 기록' : `${r.target.label}님`;
    battle = {
      rows: [
        { name: nickname, value: formatDuration(courseTime), me: true, rank: null },
        { name: r.target.label, value: formatDuration(r.target.sec), me: false, rank: null },
      ],
      caption: diff === 0 ? `${withWaGwa(who)} 같은 기록` : `${who}보다 ${formatDurationSpoken(diff)} ${diff < 0 ? '빨랐어요' : '느렸어요'}`,
    };
  }

  return {
    title: r.course?.name ?? MODE_TITLE[r.mode],
    context: r.course ? MODE_TITLE[r.mode] : '자유 달리기',
    date: dateOf(r.finishedAt),
    nickname,
    headline: o.headline,
    highlight: o.kind === 'pb' || o.kind === 'firstRecord' || o.kind === 'won',
    primary: courseTime != null ? time : distance,
    stats: courseTime != null ? [distance, pace] : [time, pace],
    verified,
    path: r.path,
    course: course?.route ?? null,
    freePath: !r.course,
    ranking: verified && r.weeklyRank ? { label: '이번 주 순위', before: r.weeklyRank.before, after: r.weeklyRank.after } : null,
    battle,
  };
}

export function fromLive(r: LiveResult, myRun: RunResult | null, nickname: string): ShareCardData {
  const h = liveHeadline(r);
  const me = r.entries.find((e) => e.isMe);
  const timeAttack = r.mode === 'TIME_ATTACK';
  const valueOf = (e: (typeof r.entries)[number]) => (e.status === 'DNF' ? '중도 포기' : timeAttack ? `${formatDistanceKm(e.distanceM)}km` : formatDuration(e.timeSec));
  const primary: Stat = timeAttack ? { label: '달린 거리', value: formatDistanceKm(me?.distanceM ?? 0), unit: 'km' } : { label: '기록', value: formatDuration(me?.timeSec ?? null) };
  return {
    title: goalLabel(r),
    context: MODE_INFO[r.mode].caption,
    date: dateOf(r.finishedAt),
    nickname,
    headline: h.title,
    highlight: me?.rank === 1,
    primary,
    stats: myRun ? [{ label: '평균 페이스', value: formatPace(myRun.avgPaceSec), unit: '/km' }, { label: '참가', value: `${r.entries.length}명` }] : [{ label: '참가', value: `${r.entries.length}명` }],
    verified: false,
    path: myRun?.path ?? [],
    course: null,
    freePath: true,
    ranking: null,
    // TOGETHER는 순위 없이 함께 달린 사람만 보여준다
    battle: {
      rows: r.entries.slice(0, 4).map((e) => ({ name: e.name, value: valueOf(e), me: e.isMe, rank: r.mode === 'TOGETHER' ? null : e.rank })),
      caption: h.detail,
    },
  };
}

// 이 기록으로 만들 수 있는 템플릿. 순위는 인증된 순위가 있을 때만, 대결은 비교 상대가 있을 때만.
export function availableTemplates(d: ShareCardData): TemplateKey[] {
  return (['map', 'record', 'ranking', 'battle'] as const).filter((t) =>
    t === 'map' ? d.path.length > 1 : t === 'ranking' ? d.ranking != null : t === 'battle' ? d.battle != null : true,
  );
}

// 처음 고를 템플릿: Live는 대결, 코스 기록은 지도(코스가 중심 객체), 코스 없는 기록은 기록(출발 지점 노출을 피함)
export function defaultTemplate(d: ShareCardData, live: boolean): TemplateKey {
  const a = availableTemplates(d);
  const want: TemplateKey = live ? 'battle' : d.freePath ? 'record' : 'map';
  return a.includes(want) ? want : 'record';
}
