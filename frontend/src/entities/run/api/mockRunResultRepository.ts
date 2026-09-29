import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';

import { currentMockAccount } from '@/entities/auth/api/mockAccounts';
import { API_BASE_URL } from '@/shared/api/config';
import { legRoute, loopRoute, type GeoPoint } from '@/shared/geo';
import { createUuid } from '@/shared/uuid';

import { toRunSummary, type RunSummary } from '../history';
import type { RunResult, RunVerification } from '../result';
import type { RunMode, RunSplit } from '../types';
import { RunResultNotFoundError, type NewRunResult, type RunResultRepository } from './runResultRepository';

// 개발 빌드에서 Result 상태를 만들어 QA하기 위한 값 (SCREEN-SPECS Result: local-only, syncing, verification pending, verified, unverified, PB, no PB).
export const RESULT_SCENARIOS = ['normal', 'localOnly', 'syncing', 'unverified', 'rejected'] as const;
export type ResultScenario = (typeof RESULT_SCENARIOS)[number];

export function parseResultScenario(value: unknown): ResultScenario {
  if (!__DEV__) return 'normal';
  return (RESULT_SCENARIOS as readonly unknown[]).includes(value) ? (value as ResultScenario) : 'normal';
}

// 서버 동기화·검증에 걸리는 시간 흉내
const SYNC_MS = 2000;
const VERIFY_MS = 2500;

// verifyFrom: 서버 검증을 시작한 시각 (기기에만 있다가 나중에 올라간 기록은 올라간 시각)
type Saved = { input: NewRunResult; savedAt: number; scenario: ResultScenario; verifyFrom?: number };

// 앱을 켜 둔 동안만 남는 저장소. 실제로는 SQLite local_run + 서버.
const saved = new Map<string, Saved>();
let nextId = 1;

const REASON: Partial<Record<RunVerification, string>> = {
  unverified: '코스 일부를 벗어나 달려서 공식 기록으로 인정되지 않았어요',
  rejected: '비정상적으로 빠른 구간이 있어 기록이 거부됐어요',
};

// 개발 빌드에서 My · 히스토리 상태를 만들어 QA하기 위한 값 (CLAUDE.md 7항: loading, empty, error, local-only)
export const HISTORY_SCENARIOS = ['normal', 'loading', 'empty', 'error', 'localOnly'] as const;
export type HistoryScenario = (typeof HISTORY_SCENARIOS)[number];

export function parseHistoryScenario(value: unknown): HistoryScenario {
  if (!__DEV__) return 'normal';
  return (HISTORY_SCENARIOS as readonly unknown[]).includes(value) ? (value as HistoryScenario) : 'normal';
}

export function createMockRunResultRepository(history: HistoryScenario = 'normal'): RunResultRepository {
  const courses = createMockCourseRepository('normal');
  const repo: RunResultRepository = {
    async list(cursor, size) {
      if (history === 'loading') await new Promise(() => {});
      await new Promise((r) => setTimeout(r, 400));
      if (history === 'error') throw new Error('network');
      // 이번 실행에서 달린 기록(기기 저장) + 서버에 있던 기록. 개발용 예시 결과(demo-)는 빼고 보여준다.
      const mine = await Promise.all([...saved.keys()].filter((id) => !id.startsWith('demo-')).map((id) => repo.get(id)));
      const all: RunSummary[] = [
        ...mine.map(toRunSummary),
        ...(history === 'localOnly' ? [toRunSummary(localOnlyRun())] : []),
        // 처음 가입한 계정에는 지난 기록이 없다
        // 서버 계정(EXPO_PUBLIC_API_URL)에는 mock 지난 기록을 섞지 않는다
        ...(history === 'empty' || API_BASE_URL != null || currentMockAccount()?.hasHistory === false ? [] : pastRuns().map(toRunSummary)),
      ].sort((a, b) => b.finishedAt - a.finishedAt);
      const start = cursor ? Number(cursor) : 0;
      const items = all.slice(start, start + size);
      return { items, nextCursor: start + size < all.length ? String(start + size) : null };
    },
    async saveFinished(input, synced) {
      const id = `run-${nextId++}`;
      saved.set(id, { input, savedAt: Date.now(), scenario: synced ? 'normal' : 'localOnly' });
      return id;
    },
    async markSynced(clientRunUuid) {
      for (const s of saved.values()) {
        if (s.input.clientRunUuid !== clientRunUuid || s.scenario !== 'localOnly') continue;
        // 올라간 시점부터 서버 검증이 시작된다
        s.scenario = 'normal';
        s.verifyFrom = Date.now();
      }
    },
    // mock 코스 등록은 기록 id를 그대로 쓴다
    async serverRunId(id) {
      return id;
    },
    async get(id) {
      const past = pastRuns().find((r) => r.id === id) ?? (id === LOCAL_ONLY_ID ? localOnlyRun() : null);
      if (past) return past;
      const s = saved.get(id);
      if (!s) throw new RunResultNotFoundError(id);
      const age = Date.now() - (s.verifyFrom ?? s.savedAt);
      const { input, scenario } = s;
      const base: RunResult = {
        id,
        ...input,
        finishedAt: s.savedAt,
        sync: 'synced',
        verification: input.course ? 'pending' : 'none',
        verificationReason: null,
        pb: null,
        weeklyRank: null,
        friendBest: null,
      };

      if (scenario === 'localOnly') return { ...base, sync: 'localOnly' };
      if (scenario === 'syncing' && age < SYNC_MS) return { ...base, sync: 'syncing' };
      if (!input.course) return base;

      const detail = await courses.getDetail(input.course.id).catch(() => null);
      const friendBest = detail?.competition?.friendBest ?? null;
      const verifyAt = (scenario === 'syncing' ? SYNC_MS : 0) + VERIFY_MS;
      if (age < verifyAt) return { ...base, friendBest };

      // 코스 끝까지 달리지 않았으면 서버 검증(RouteMatch/EndPoint)을 통과하지 못한다
      const verification: RunVerification =
        scenario === 'unverified' || scenario === 'rejected' ? scenario : input.course.timeSec == null ? 'unverified' : 'verified';
      if (verification !== 'verified') {
        return {
          ...base,
          friendBest,
          verification,
          verificationReason: input.course.timeSec == null && verification === 'unverified' ? '코스를 끝까지 달리지 않았어요' : (REASON[verification] ?? null),
        };
      }

      const time = input.course.timeSec!;
      const previousSec = detail?.myRecord?.bestSec ?? null;
      const improved = previousSec == null || time < previousSec;
      return {
        ...base,
        friendBest,
        verification,
        pb: { previousSec, improved },
        weeklyRank: mockRank(detail?.competition?.myWeeklyRank ?? null, detail?.competition?.weeklyTop.map((e) => e.timeSec) ?? [], time, improved),
      };
    },
  };
  return repo;
}

// ── 서버에 이미 있던 지난 기록 (mock) ──
// 코스 상세 mock과 맞춘다: 수성못 둘레길 PB 10:12, 최근 10:48 / 신천 강변 왕복 PB 24:40, 최근 25:12.
// 함께 탭 최근 결과(어제 3km 레이스, 사흘 전 5km 함께)와도 맞춘다.
type PastPlan = {
  daysAgo: number;
  hour: number;
  mode: RunMode;
  courseId?: 'c-suseongmot' | 'c-sincheon' | 'c-deuran';
  distanceM: number;
  sec: number;
  verification?: RunVerification;
  pb?: { previousSec: number | null; improved: boolean };
  // 코스를 끝까지 달리지 못함
  dnf?: boolean;
};

const COURSE_NAME = { 'c-suseongmot': '수성못 둘레길', 'c-sincheon': '신천 강변 왕복', 'c-deuran': '들안로 왕복' } as const;

const PAST: PastPlan[] = [
  { daysAgo: 1, hour: 20, mode: 'LIVE_RACE', distanceM: 3000, sec: 948 },
  { daysAgo: 2, hour: 19, mode: 'PB', courseId: 'c-suseongmot', distanceM: 1915, sec: 648, pb: { previousSec: 612, improved: false } },
  { daysAgo: 3, hour: 7, mode: 'TOGETHER', distanceM: 5000, sec: 1690 },
  { daysAgo: 5, hour: 6, mode: 'COURSE', courseId: 'c-sincheon', distanceM: 4659, sec: 1512, pb: { previousSec: 1480, improved: false } },
  { daysAgo: 6, hour: 21, mode: 'FREE', distanceM: 4210, sec: 1395 },
  { daysAgo: 8, hour: 19, mode: 'CHALLENGE', courseId: 'c-deuran', distanceM: 1350, sec: 420, verification: 'unverified', dnf: true },
  { daysAgo: 9, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 655, verification: 'unverified' },
  { daysAgo: 12, hour: 20, mode: 'PB', courseId: 'c-suseongmot', distanceM: 1915, sec: 612, pb: { previousSec: 625, improved: true } },
  { daysAgo: 14, hour: 6, mode: 'FREE', distanceM: 7030, sec: 2380 },
  { daysAgo: 16, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 640, pb: { previousSec: 625, improved: false } },
  { daysAgo: 19, hour: 6, mode: 'COURSE', courseId: 'c-sincheon', distanceM: 4659, sec: 1480, pb: { previousSec: 1535, improved: true } },
  { daysAgo: 21, hour: 21, mode: 'FREE', distanceM: 3150, sec: 1050 },
  { daysAgo: 24, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 625, pb: { previousSec: 641, improved: true } },
  { daysAgo: 27, hour: 7, mode: 'FREE', distanceM: 10020, sec: 3480 },
  { daysAgo: 30, hour: 20, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 662, pb: { previousSec: 641, improved: false } },
  { daysAgo: 33, hour: 6, mode: 'COURSE', courseId: 'c-sincheon', distanceM: 4659, sec: 1535, pb: { previousSec: null, improved: true } },
  { daysAgo: 35, hour: 21, mode: 'FREE', distanceM: 5040, sec: 1690 },
  { daysAgo: 38, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 641, pb: { previousSec: 668, improved: true } },
  { daysAgo: 41, hour: 7, mode: 'FREE', distanceM: 3020, sec: 1040 },
  { daysAgo: 44, hour: 20, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 671, pb: { previousSec: 668, improved: false } },
  { daysAgo: 47, hour: 6, mode: 'FREE', distanceM: 6110, sec: 2105 },
  { daysAgo: 51, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 668, pb: { previousSec: 690, improved: true } },
  { daysAgo: 55, hour: 21, mode: 'FREE', distanceM: 4080, sec: 1430 },
  { daysAgo: 58, hour: 7, mode: 'FREE', distanceM: 8050, sec: 2860 },
  { daysAgo: 62, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 690, pb: { previousSec: 702, improved: true } },
  { daysAgo: 66, hour: 20, mode: 'FREE', distanceM: 3010, sec: 1090 },
  { daysAgo: 70, hour: 19, mode: 'COURSE', courseId: 'c-suseongmot', distanceM: 1915, sec: 702, pb: { previousSec: null, improved: true } },
  { daysAgo: 74, hour: 6, mode: 'FREE', distanceM: 5020, sec: 1810 },
  { daysAgo: 79, hour: 21, mode: 'FREE', distanceM: 2540, sec: 930 },
  { daysAgo: 85, hour: 7, mode: 'FREE', distanceM: 3530, sec: 1290 },
  { daysAgo: 92, hour: 20, mode: 'FREE', distanceM: 2010, sec: 750 },
];

const HOME: GeoPoint = { latitude: 35.8285, longitude: 128.618 };
const routeOf = (id: keyof typeof MOCK_COURSE_ROUTES) => MOCK_COURSE_ROUTES[id].route.map(([latitude, longitude]) => ({ latitude, longitude }));

// 1km마다 걸린 시간. 뒤로 갈수록 조금씩 흔들리게 만든다.
function splitsOf(distanceM: number, sec: number, seed: number): RunSplit[] {
  const pace = sec / (distanceM / 1000);
  return Array.from({ length: Math.floor(distanceM / 1000) }, (_, i) => ({ km: i + 1, sec: Math.round(pace * (1 + 0.025 * Math.sin(i * 1.7 + seed))) }));
}

// 코스 없는 기록은 동네를 도는 루프로 그린다. 거리에 맞게 반지름을 잡고 기록마다 모양을 조금 바꾼다.
function freePath(distanceM: number, seed: number): GeoPoint[] {
  const r = Math.min(distanceM, 6000) / (2 * Math.PI);
  const center = legRoute(HOME, [[Math.cos(seed) * 300, Math.sin(seed) * 300]])[1];
  return loopRoute(center, r * (1 + 0.15 * Math.sin(seed)), r * (1 - 0.15 * Math.sin(seed)), 48, 0.08, seed);
}

let pastCache: { day: number; runs: RunResult[] } | null = null;

function pastRuns(): RunResult[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (pastCache?.day === today.getTime()) return pastCache.runs;
  const runs = PAST.map((p, i): RunResult => {
    // 시작 시각이 정각에 몰리지 않게 분을 흩뜨린다
    const minute = (i * 23 + 7) % 60;
    const finishedAt = today.getTime() - p.daysAgo * 86_400_000 + p.hour * 3_600_000 + minute * 60_000 + p.sec * 1000;
    const route = p.courseId ? routeOf(p.courseId) : null;
    const path = route ? (p.dnf ? route.slice(0, Math.ceil(route.length * 0.6)) : route) : freePath(p.distanceM, i + 1);
    const verification: RunVerification = p.verification ?? (p.courseId ? 'verified' : 'none');
    return {
      id: `run-past-${i + 1}`,
      clientRunUuid: `past-${i + 1}`,
      mode: p.mode,
      startedAt: finishedAt - p.sec * 1000,
      finishedAt,
      distanceM: p.distanceM,
      activeSec: p.sec,
      avgPaceSec: Math.round(p.sec / (p.distanceM / 1000)),
      splits: splitsOf(p.distanceM, p.sec, i),
      path,
      course: p.courseId ? { id: p.courseId, name: COURSE_NAME[p.courseId], timeSec: p.dnf ? null : p.sec } : null,
      target: null,
      sync: 'synced',
      verification,
      verificationReason: verification === 'unverified' ? (p.dnf ? '코스를 끝까지 달리지 않았어요' : (REASON.unverified ?? null)) : null,
      pb: verification === 'verified' ? (p.pb ?? null) : null,
      weeklyRank: null,
      friendBest: null,
    };
  });
  pastCache = { day: today.getTime(), runs };
  return runs;
}

// localOnly 상황: 오늘 아침 기록이 아직 기기에만 있다
const LOCAL_ONLY_ID = 'run-local-1';
function localOnlyRun(): RunResult {
  const at = new Date();
  at.setHours(6, 40, 0, 0);
  const distanceM = 3120;
  const sec = 1015;
  const finishedAt = Math.min(at.getTime(), Date.now() - 600_000);
  return {
    id: LOCAL_ONLY_ID,
    clientRunUuid: 'local-1',
    mode: 'FREE',
    startedAt: finishedAt - sec * 1000,
    finishedAt,
    distanceM,
    activeSec: sec,
    avgPaceSec: Math.round(sec / (distanceM / 1000)),
    splits: splitsOf(distanceM, sec, 9),
    path: freePath(distanceM, 9),
    course: null,
    target: null,
    sync: 'localOnly',
    verification: 'none',
    verificationReason: null,
    pb: null,
    weeklyRank: null,
    friendBest: null,
  };
}

// mock 순위: 상위 기록보다 빠르면 그 자리, 아니면 기존 순위에서 조금 오른다
function mockRank(before: number | null, topTimes: number[], time: number, improved: boolean) {
  const faster = topTimes.filter((t) => t < time).length;
  if (faster < topTimes.length) return { before, after: faster + 1 };
  if (before == null) return { before, after: topTimes.length + 12 };
  return { before, after: improved ? Math.max(topTimes.length + 1, before - 4) : before };
}

/** 개발용 예시 결과. /run/result?demo=… 로 바로 열어 상태를 확인한다. */
export function seedDemoResult(kind: 'pb' | 'noPb' | 'free' | 'dnf', scenario: ResultScenario): string {
  const route = MOCK_COURSE_ROUTES['c-suseongmot'].route.map(([latitude, longitude]) => ({ latitude, longitude }));
  const time = kind === 'noPb' ? 640 : 608;
  const course = kind === 'free' ? null : { id: 'c-suseongmot', name: '수성못 둘레길', timeSec: kind === 'dnf' ? null : time };
  const distanceM = kind === 'dnf' ? 1320 : 1915;
  const activeSec = kind === 'dnf' ? 430 : time;
  const input: NewRunResult = {
    clientRunUuid: createUuid(),
    mode: kind === 'free' ? 'FREE' : 'PB',
    startedAt: Date.now() - activeSec * 1000,
    distanceM,
    activeSec,
    avgPaceSec: Math.round(activeSec / (distanceM / 1000)),
    splits: distanceM >= 1000 ? [{ km: 1, sec: Math.round(activeSec * (1000 / distanceM)) - 3 }] : [],
    path: kind === 'dnf' ? route.slice(0, 20) : route,
    course,
    target: kind === 'free' ? null : { sec: 602, label: '내 PB −10초' },
  };
  const id = `demo-${kind}-${scenario}-${nextId++}`;
  saved.set(id, { input, savedAt: Date.now(), scenario });
  return id;
}
