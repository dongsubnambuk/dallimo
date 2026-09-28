import { ShareNotFoundError, SHARE_URL_BASE, type ShareRepository } from './shareRepository';
import type { ShareTarget } from '../types';

// 개발용 공유 상황: 링크를 만들 수 없는 경우(오프라인)
export const SHARE_SCENARIOS = ['normal', 'offline'] as const;
export type ShareScenario = (typeof SHARE_SCENARIOS)[number];

export function parseShareScenario(value: unknown): ShareScenario {
  if (!__DEV__) return 'normal';
  return (SHARE_SCENARIOS as readonly unknown[]).includes(value) ? (value as ShareScenario) : 'normal';
}

const links = new Map<string, ShareTarget>();

// share_code는 서버가 만드는 추측하기 어려운 값이다 (share_code UNIQUE, 991행). mock은 짧은 무작위 문자열.
function code() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function createMockShareRepository(scenario: ShareScenario = 'normal'): ShareRepository {
  return {
    async create(type, referenceId, courseId) {
      await new Promise((r) => setTimeout(r, 500));
      if (scenario === 'offline') throw new Error('network');
      // 같은 대상은 같은 링크를 돌려준다
      const found = [...links.entries()].find(([, t]) => t.type === type && t.referenceId === referenceId);
      const c = found?.[0] ?? code();
      if (!found) links.set(c, { type, referenceId, courseId });
      return { code: c, url: `${SHARE_URL_BASE}${c}` };
    },
    async resolve(c) {
      await new Promise((r) => setTimeout(r, 300));
      const t = links.get(c);
      if (!t) throw new ShareNotFoundError(c);
      return t;
    },
  };
}

// 앱 전체에서 같은 링크 목록을 쓴다
export const shareRepository = createMockShareRepository();
