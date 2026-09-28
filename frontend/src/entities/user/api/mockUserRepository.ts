import { createMockRunResultRepository, type HistoryScenario } from '@/entities/run/api/mockRunResultRepository';

import type { Me } from '../types';
import type { UserRepository } from './userRepository';

// 누적 통계는 mock 히스토리 전체를 더해 만든다. 실제로는 서버 집계 값이다.
export function createMockUserRepository(scenario: HistoryScenario): UserRepository {
  const runs = createMockRunResultRepository(scenario);
  return {
    async getMe(): Promise<Me> {
      const items = [];
      let cursor: string | null = null;
      do {
        const page = await runs.list(cursor, 50);
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return {
        profile: { userId: 'me', nickname: '수성러너', profileImageUrl: null },
        stats: {
          totalDistanceM: items.reduce((s, r) => s + r.distanceM, 0),
          totalActiveSec: items.reduce((s, r) => s + r.activeSec, 0),
          runCount: items.length,
        },
      };
    },
  };
}
