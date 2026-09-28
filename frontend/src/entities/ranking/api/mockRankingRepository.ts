import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import type { CourseDetail } from '@/entities/course/types';

import type { MyStanding, RankingEntry, RankingPage, RankingPeriod, RankingQuery, RankingScope } from '../types';
import { RankingRepositoryError, type RankingRepository } from './rankingRepository';

// 개발 빌드에서 랭킹 상태를 만들어 QA하기 위한 값 (SCREEN-SPECS Ranking: loading, empty, user unranked, self visible, cursor loading).
export const RANKING_SCENARIOS = ['normal', 'loading', 'empty', 'unranked', 'error'] as const;
export type RankingScenario = (typeof RANKING_SCENARIOS)[number];

export function parseRankingScenario(value: unknown): RankingScenario {
  if (!__DEV__) return 'normal';
  return (RANKING_SCENARIOS as readonly unknown[]).includes(value) ? (value as RankingScenario) : 'normal';
}

const DELAY_MS = 500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ME = { userId: 'me', name: '수성러너' };

// 같은 입력이면 같은 이름이 나오도록 순위로 고르는 닉네임
const NAMES = ['새벽러너', '호수한바퀴', '페이스메이커', '달빛조거', '수성토끼', '오늘도5K', '런린이', '천천히꾸준히', '대구러너', '강변질주', '퇴근런', '아침공기', '못가의바람', '러닝메이트', '한걸음더', '느린거북', '들안길', '범어언덕', '신천바람', '두산러너'];
const nameAt = (seed: number) => `${NAMES[seed % NAMES.length]}${seed >= NAMES.length ? Math.floor(seed / NAMES.length) + 1 : ''}`;

type Board = { entries: RankingEntry[]; me: RankingEntry | null };

// mock 순위표: 1위 기록과 내 기록(내 순위)을 지나는 곡선으로 나머지 기록을 만든다.
// 이번 주 1~3위는 코스 상세 미리보기와 같은 사람·기록을 쓴다.
function buildBoard(d: CourseDetail, period: RankingPeriod, scope: RankingScope, unranked: boolean): Board {
  const comp = d.competition;
  const km = d.distanceM / 1000;
  const weeklyRank = comp?.myWeeklyRank ?? null;
  const myBest = unranked ? null : (d.myRecord?.bestSec ?? null);
  const total = period === 'weekly' ? d.weeklyRunnerCount : period === 'monthly' ? Math.min(d.finisherCount, d.weeklyRunnerCount * 3) : d.finisherCount;
  const myRank = myBest == null || weeklyRank == null ? null : period === 'weekly' ? weeklyRank : Math.min(total, Math.round(weeklyRank * (period === 'monthly' ? 2.2 : 6.5)));
  const top = period === 'weekly' ? (comp?.weeklyTop ?? []) : [];
  const leader = (top[0]?.timeSec ?? comp?.leaderSec ?? Math.round(d.estimatedSec * 0.75)) * (period === 'weekly' ? 1 : period === 'monthly' ? 0.98 : 0.95);
  const anchorRank = myRank ?? Math.max(2, Math.round(total / 2));
  const anchorSec = myBest ?? d.estimatedSec;
  const at = (r: number) => Math.round(leader + (anchorSec - leader) * Math.pow((r - 1) / Math.max(1, anchorRank - 1), 0.8));

  const friends = new Set<string>(comp?.friendBest ? [comp.friendBest.name] : []);
  const entries: RankingEntry[] = [];
  for (let r = 1; r <= total; r++) {
    if (r === myRank && myBest != null) {
      entries.push({ rank: r, userId: ME.userId, name: ME.name, timeSec: myBest, paceSecPerKm: Math.round(myBest / km), relation: 'self', isPB: true });
      continue;
    }
    const t = top[r - 1];
    // 순위가 뒤로 갈수록 기록이 느려지게 한다 (앞 사람보다 빠를 수 없다)
    const prev = entries[entries.length - 1]?.timeSec ?? 0;
    const timeSec = t ? t.timeSec : Math.max(at(r), prev);
    const name = t ? t.name : nameAt(r * 7 + (period === 'weekly' ? 0 : period === 'monthly' ? 3 : 11));
    // 내 앞뒤에 친구 두 명을 둔다 (RNK-004 친구 랭킹 확인용)
    const friend = friends.has(name) || (myRank != null && (r === myRank - 5 || r === myRank + 7));
    if (friend) friends.add(name);
    entries.push({ rank: r, userId: `u-${period}-${r}`, name, timeSec, paceSecPerKm: Math.round(timeSec / km), relation: friend ? 'friend' : 'normal' });
  }
  // 친구 최고 기록이 순위표에 없으면 기록이 맞는 자리의 사람을 그 친구로 바꾼다 (순위 수와 내 순위는 그대로)
  const fb = comp?.friendBest;
  if (fb && !entries.some((e) => e.name === fb.name)) {
    const i = entries.findIndex((e) => e.relation === 'normal' && e.timeSec >= fb.timeSec);
    const prev = entries[i - 1];
    if (i >= 0 && (!prev || prev.timeSec <= fb.timeSec)) {
      entries[i] = { ...entries[i], userId: `u-friend-${fb.name}`, name: fb.name, timeSec: fb.timeSec, paceSecPerKm: Math.round(fb.timeSec / km), relation: 'friend' };
    }
  }

  const board = scope === 'friends' ? entries.filter((e) => e.relation !== 'normal').map((e, i) => ({ ...e, rank: i + 1 })) : entries;
  return { entries: board, me: board.find((e) => e.relation === 'self') ?? null };
}

export function createMockRankingRepository(scenario: RankingScenario): RankingRepository {
  const courses = createMockCourseRepository('normal');
  const cache = new Map<string, Board>();
  const board = async (courseId: string, scope: RankingScope, period: RankingPeriod) => {
    const key = `${courseId}:${scope}:${period}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const d = await courses.getDetail(courseId);
    const b = scenario === 'empty' ? { entries: [], me: null } : buildBoard(d, period, scope, scenario === 'unranked');
    cache.set(key, b);
    return b;
  };

  return {
    async getPage({ courseId, scope, period, cursor, size }: RankingQuery): Promise<RankingPage> {
      if (scenario === 'loading') return new Promise(() => {});
      await wait(cursor ? DELAY_MS * 1.6 : DELAY_MS);
      if (scenario === 'error') throw new RankingRepositoryError('랭킹 서버에 연결하지 못했어요');
      const b = await board(courseId, scope, period);
      const from = cursor ? Number(cursor) : 0;
      const entries = b.entries.slice(from, from + size);
      return { entries, nextCursor: from + size < b.entries.length ? String(from + size) : null };
    },
    async getMyStanding(courseId, scope, period): Promise<MyStanding> {
      if (scenario === 'loading') return new Promise(() => {});
      await wait(DELAY_MS);
      if (scenario === 'error') throw new RankingRepositoryError('랭킹 서버에 연결하지 못했어요');
      const b = await board(courseId, scope, period);
      if (!b.me) return { total: b.entries.length, entry: null, around: [] };
      const i = b.me.rank - 1;
      return { total: b.entries.length, entry: b.me, around: b.entries.slice(Math.max(0, i - 2), i + 3) };
    },
  };
}
