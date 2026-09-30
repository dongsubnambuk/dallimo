import type { MyProfile } from '@/entities/user/types';

import type { AuthSession } from '../types';
import { AuthError, type AuthRepository } from './authRepository';
import {
  createMockAccount,
  currentMockAccount,
  findAccount,
  findAccountByEmail,
  nicknameTaken,
  removeMockAccount,
  setCurrentMockAccount,
  setMockPassword,
  type MockAccount,
} from './mockAccounts';

// 서버 없이 쓸 때의 인증. 서버와 같은 오류를 흉내 낸다.
// 개발용: 이메일에 "offline"이 들어가면 서버에 닿지 못한 경우를 흉내 낸다 (SCR-A01 오류 상태 확인)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ACCESS_MS = 30 * 60_000;
const REFRESH_MS = 30 * 24 * 3_600_000;

const profileOf = (a: MockAccount): MyProfile => ({
  userId: a.userId,
  email: a.email,
  nickname: a.nickname,
  friendCode: a.friendCode,
});

function sessionOf(a: MockAccount): AuthSession {
  const now = Date.now();
  return {
    tokens: {
      accessToken: `mock-access-${a.userId}-${now}`,
      accessTokenExpiresAt: now + ACCESS_MS,
      refreshToken: `mock-refresh-${a.userId}-${now}`,
      refreshTokenExpiresAt: now + REFRESH_MS,
    },
    user: profileOf(a),
  };
}

export function createMockAuthRepository(): AuthRepository {
  const failIfOffline = (email: string) => {
    if (__DEV__ && email.includes('offline')) throw new AuthError('network', '서버에 연결하지 못했어요');
  };
  return {
    async signup(input) {
      await wait(600);
      failIfOffline(input.email);
      if (findAccountByEmail(input.email)) throw new AuthError('emailTaken', '이미 가입한 이메일이에요.');
      if (nicknameTaken(input.nickname.trim())) throw new AuthError('nicknameTaken', '이미 쓰고 있는 닉네임이에요.');
      return sessionOf(await createMockAccount(input.email, input.password, input.nickname));
    },
    async login(email, password) {
      await wait(600);
      failIfOffline(email);
      const a = findAccountByEmail(email);
      if (!a || a.password !== password) throw new AuthError('invalidCredentials', '이메일 또는 비밀번호가 맞지 않아요.');
      await setCurrentMockAccount(a.userId);
      return sessionOf(a);
    },
    async refresh(refreshToken) {
      await wait(200);
      const userId = /^mock-refresh-(.+)-\d+$/.exec(refreshToken)?.[1] ?? null;
      const a = findAccount(userId);
      if (!a || currentMockAccount()?.userId !== a.userId) throw new AuthError('unauthorized', '다시 로그인해 주세요.');
      return sessionOf(a);
    },
    async logout() {
      await wait(200);
      await setCurrentMockAccount(null);
    },
    async withdraw() {
      await wait(500);
      const a = currentMockAccount();
      if (a) await removeMockAccount(a.userId);
    },
    async changePassword(currentPassword, newPassword) {
      await wait(500);
      const a = currentMockAccount();
      if (!a) throw new AuthError('unauthorized', '다시 로그인해 주세요.');
      if (a.password !== currentPassword) throw new AuthError('passwordMismatch', '지금 비밀번호가 맞지 않아요.');
      if (currentPassword === newPassword) throw new AuthError('invalid', '지금 비밀번호와 다른 비밀번호로 바꿔 주세요.');
      await setMockPassword(a.userId, newPassword);
    },
  };
}
