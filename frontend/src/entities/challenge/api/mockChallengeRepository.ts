import type { Challenge } from '../types';
import type { ChallengeRepository } from './challengeRepository';

// 서버 없이 확인할 때의 도전. 앱 실행 동안 만든 도전이 목록에 남는다.
// 판정은 서버가 하므로 mock 도전은 만든 상태(open)로 남는다. 결과 화면은 기기에서 목표와 비교한다.
const DAY = 86_400_000;
const ME = { userId: 'me', nickname: '수성러너' };

let state: Challenge[] | null = null;
let nextId = 10;

function initial(): Challenge[] {
  const now = Date.now();
  const base = { targetBest: { recordId: 'rec-minsu', timeSec: 1491 }, finishedAt: null, runResultId: null } as const;
  return [
    {
      ...base,
      id: 'ch-1',
      status: 'success',
      role: 'sent',
      challenger: ME,
      target: { userId: 'u-minsu', nickname: '민수' },
      course: { id: 'c-suseongmot', name: '수성못 둘레길', distanceM: 4210 },
      targetRecordId: 'rec-minsu',
      targetSec: 1491,
      resultSec: 1478,
      createdAt: now - 2 * DAY,
      finishedAt: now - 2 * DAY + 1_600_000,
    },
    {
      ...base,
      id: 'ch-2',
      status: 'failed',
      role: 'received',
      challenger: { userId: 'u-jisu', nickname: '지수' },
      target: ME,
      course: { id: 'c-deuran', name: '들안로 왕복', distanceM: 3000 },
      targetRecordId: 'rec-me-deuran',
      targetSec: 1090,
      resultSec: 1122,
      createdAt: now - 4 * DAY,
      finishedAt: now - 4 * DAY + 1_200_000,
      targetBest: { recordId: 'rec-me-deuran', timeSec: 1090 },
    },
  ];
}

export function createMockChallengeRepository(): ChallengeRepository {
  const all = () => (state ??= initial());
  const find = (id: string) => {
    const c = all().find((x) => x.id === id);
    if (!c) throw new Error('도전을 찾을 수 없어요');
    return c;
  };
  return {
    async create(targetRecordId) {
      await new Promise((r) => setTimeout(r, 300));
      const c: Challenge = {
        id: `ch-${nextId++}`,
        status: 'open',
        role: 'sent',
        challenger: ME,
        target: { userId: 'u-minsu', nickname: '민수' },
        course: { id: 'c-suseongmot', name: '수성못 둘레길', distanceM: 4210 },
        targetRecordId,
        targetSec: 1491,
        resultSec: null,
        runResultId: null,
        createdAt: Date.now(),
        finishedAt: null,
        targetBest: { recordId: targetRecordId, timeSec: 1491 },
      };
      all().unshift(c);
      return c;
    },
    async get(id) {
      return find(id);
    },
    async cancel(id) {
      const c = find(id);
      if (c.status === 'open') c.status = 'canceled';
      return c;
    },
    async list(userId) {
      await new Promise((r) => setTimeout(r, 300));
      return all().filter((c) => c.status !== 'canceled' && (!userId || c.challenger.userId === userId || c.target.userId === userId));
    },
  };
}
