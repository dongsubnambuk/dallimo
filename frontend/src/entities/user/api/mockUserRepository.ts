import { currentMockAccount, DEMO_EMAIL, nicknameTaken, updateMockAccount } from '@/entities/auth/api/mockAccounts';
import { createMockRunResultRepository, type HistoryScenario } from '@/entities/run/api/mockRunResultRepository';

import type { Me, MyProfile, NicknameCheck } from '../types';
import type { UserRepository } from './userRepository';

export const NICKNAME_MAX = 40;

// 로그인 없이 개발용 주소로 바로 들어오면 기존 계정(수성러너)으로 보여준다
function profile(): MyProfile {
  const a = currentMockAccount();
  return {
    userId: a?.userId ?? 'me',
    email: a?.email ?? DEMO_EMAIL,
    nickname: a?.nickname ?? '수성러너',
    profileImageUrl: a?.profileImageUrl ?? null,
    friendCode: a?.friendCode ?? 'RUN-7Q2KSU',
  };
}

export function checkNicknameLocal(nickname: string): NicknameCheck | null {
  const n = nickname.trim();
  if (!n) return 'empty';
  if (n.length > NICKNAME_MAX) return 'tooLong';
  return null;
}

// 누적 통계는 mock 히스토리 전체를 더해 만든다. 실제로는 서버 집계 값이다.
export function createMockUserRepository(scenario: HistoryScenario = 'normal'): UserRepository {
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
        profile: profile(),
        stats: {
          totalDistanceM: items.reduce((s, r) => s + r.distanceM, 0),
          totalActiveSec: items.reduce((s, r) => s + r.activeSec, 0),
          runCount: items.length,
        },
      };
    },
    async updateMe(update) {
      await new Promise((r) => setTimeout(r, 500));
      const me = profile();
      const local = update.nickname != null ? checkNicknameLocal(update.nickname) : null;
      if (local) throw new Error(local);
      if (update.nickname != null && nicknameTaken(update.nickname.trim(), me.userId)) throw new Error('taken');
      await updateMockAccount(me.userId, {
        ...(update.nickname != null ? { nickname: update.nickname.trim() } : {}),
        ...(update.profileImageUri !== undefined ? { profileImageUrl: update.profileImageUri } : {}),
      });
      return profile();
    },
    async checkNickname(nickname) {
      await new Promise((r) => setTimeout(r, 300));
      // 로그인 전(가입 중)이면 모든 계정과 비교한다
      return checkNicknameLocal(nickname) ?? (nicknameTaken(nickname.trim(), currentMockAccount()?.userId) ? 'taken' : 'ok');
    },
  };
}
