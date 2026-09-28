import { AuthError, type AuthRepository } from './authRepository';
import { currentMockAccount, findAccount, signInMockAccount, signOutMockAccount, withdrawMockAccount } from './mockAccounts';

// 개발용 로그인 상황 (SCREEN-SPECS SCR-A01: 로그인, 기존 세션 복구)
export const LOGIN_SCENARIOS = ['normal', 'error'] as const;
export type LoginScenario = (typeof LOGIN_SCENARIOS)[number];

export function parseLoginScenario(value: unknown): LoginScenario {
  if (!__DEV__) return 'normal';
  return (LOGIN_SCENARIOS as readonly unknown[]).includes(value) ? (value as LoginScenario) : 'normal';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tokenOf = (userId: string) => ({
  accessToken: `mock-access-${userId}-${Date.now()}`,
  refreshToken: `mock-refresh-${userId}-${Date.now()}`,
});

export function createMockAuthRepository(scenario: LoginScenario = 'normal'): AuthRepository {
  return {
    async socialLogin(provider) {
      await wait(700);
      if (scenario === 'error') throw new AuthError('network', '서버에 연결하지 못했어요');
      const a = await signInMockAccount(provider);
      return {
        tokens: tokenOf(a.userId),
        user: { userId: a.userId, nickname: a.nickname ?? '', profileImageUrl: a.profileImageUrl, friendCode: a.friendCode, provider: a.provider },
        isNewUser: a.nickname == null,
      };
    },
    async refresh(refreshToken) {
      await wait(300);
      const userId = /^mock-refresh-(.+)-\d+$/.exec(refreshToken)?.[1] ?? null;
      const a = findAccount(userId);
      if (!a || currentMockAccount()?.userId !== a.userId) throw new AuthError('unauthorized', '다시 로그인해 주세요');
      return tokenOf(a.userId);
    },
    async logout() {
      await wait(300);
      await signOutMockAccount();
    },
    async withdraw() {
      await wait(600);
      const a = currentMockAccount();
      if (a) await withdrawMockAccount(a.userId);
    },
  };
}
