import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';

import type { RunResult, RunVerification } from '../result';
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

type Saved = { input: NewRunResult; savedAt: number; scenario: ResultScenario };

// 앱을 켜 둔 동안만 남는 저장소. 실제로는 SQLite local_run + 서버.
const saved = new Map<string, Saved>();
let nextId = 1;

const REASON: Partial<Record<RunVerification, string>> = {
  unverified: '코스 일부를 벗어나 달려서 공식 기록으로 인정되지 않았어요',
  rejected: '비정상적으로 빠른 구간이 있어 기록이 거부됐어요',
};

export function createMockRunResultRepository(): RunResultRepository {
  const courses = createMockCourseRepository('normal');
  return {
    async saveFinished(input, synced) {
      const id = `run-${nextId++}`;
      saved.set(id, { input, savedAt: Date.now(), scenario: synced ? 'normal' : 'localOnly' });
      return id;
    },
    async get(id) {
      const s = saved.get(id);
      if (!s) throw new RunResultNotFoundError(id);
      const age = Date.now() - s.savedAt;
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
    mode: kind === 'free' ? 'FREE' : 'PB',
    distanceM,
    activeSec,
    avgPaceSec: activeSec / (distanceM / 1000),
    splits: distanceM >= 1000 ? [{ km: 1, sec: Math.round(activeSec * (1000 / distanceM)) - 3 }] : [],
    path: kind === 'dnf' ? route.slice(0, 20) : route,
    course,
    target: kind === 'free' ? null : { sec: 602, label: '내 PB −10초' },
  };
  const id = `demo-${kind}-${scenario}-${nextId++}`;
  saved.set(id, { input, savedAt: Date.now(), scenario });
  return id;
}
