import type { Activity } from '../types';
import type { ActivityRepository } from './activityRepository';

// 개발용 상황: 친구 활동 있음 · 없음 · 오류
export const ACTIVITY_SCENARIOS = ['normal', 'empty', 'error'] as const;
export type ActivityScenario = (typeof ACTIVITY_SCENARIOS)[number];

export function parseActivityScenario(value: unknown): ActivityScenario {
  if (!__DEV__) return 'normal';
  return (ACTIVITY_SCENARIOS as readonly unknown[]).includes(value) ? (value as ActivityScenario) : 'normal';
}

const H = 3_600_000;
const course = (id: string, name: string, distanceM: number) => ({ id, name, distanceM });
const base = { isMine: false, timeSec: null, previousSec: null, rank: null, target: null };

// mock 코스(수성못 둘레길 등)와 이어지는 예시
const MOCK: Activity[] = [
  { ...base, id: 'a-1', type: 'CHALLENGE_WON', userId: 'u-minsu', nickname: '민수', createdAt: Date.now() - 2 * H, course: course('c-suseongmot', '수성못 둘레길', 1900), timeSec: 598, target: { nickname: '수성러너', timeSec: 612, isMe: true } },
  { ...base, id: 'a-2', type: 'WEEKLY_TOP', userId: 'u-jisu', nickname: '지수', createdAt: Date.now() - 5 * H, course: course('c-sincheon', '신천 강변 왕복', 4600), timeSec: 1302, rank: 2 },
  { ...base, id: 'a-3', type: 'PB', userId: 'u-jisu', nickname: '지수', createdAt: Date.now() - 5 * H, course: course('c-sincheon', '신천 강변 왕복', 4600), timeSec: 1302, previousSec: 1355 },
  { ...base, id: 'a-4', type: 'COURSE_CREATED', userId: 'u-haneul', nickname: '하늘', createdAt: Date.now() - 26 * H, course: course('c-dusan', '두산오거리 야간 3K', 3000) },
  { ...base, id: 'a-5', type: 'PB', userId: 'me', nickname: '수성러너', isMine: true, createdAt: Date.now() - 50 * H, course: course('c-suseongmot', '수성못 둘레길', 1900), timeSec: 612, previousSec: null },
];

export function createMockActivityRepository(scenario: ActivityScenario = 'normal'): ActivityRepository {
  return {
    async list() {
      await new Promise((r) => setTimeout(r, 500));
      if (scenario === 'error') throw new Error('network');
      return { items: scenario === 'empty' ? [] : MOCK, nextCursor: null };
    },
  };
}
