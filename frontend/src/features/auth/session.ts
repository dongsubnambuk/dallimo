import { useSyncExternalStore } from 'react';

import { authRepository } from '@/entities/auth/api';
import { AuthError } from '@/entities/auth/api/authRepository';
import { loadMockAccounts } from '@/entities/auth/api/mockAccounts';
import type { AuthSession, SignupInput } from '@/entities/auth/types';
import { getActiveRun } from '@/features/run/engine/activeRunSession';
import { registerAuthHooks } from '@/shared/api/http';
import { loadPreferences } from '@/shared/preferences';
import { clearRecentSearches } from '@/shared/recentSearches';
import { getDeviceId } from '@/shared/storage/deviceId';
import { getItem, removeItem, setItem } from '@/shared/storage/keyValueStore';

// 로그인 세션 (14.1장).
// - Access Token은 메모리에만 둔다. 기기에는 Refresh Token만 남긴다(iOS Keychain · Android Keystore).
// - 만료 1분 전이면 요청 전에 미리 새로 받는다. 서버가 만료라고 하면 한 번 새로 받아 다시 보낸다(shared/api/http).
// - 새로 받기는 한 번에 하나만 한다(동시에 여러 요청이 와도 같은 결과를 기다린다). Refresh Token이 매번 바뀌기 때문이다.
// - 서버가 세션이 끝났다고 하면(로그아웃 · 다른 곳에서 탈취 감지 · 탈퇴) 로그인 화면으로 간다.
// - 서버에 닿지 못하면 세션을 유지한다(러닝은 오프라인에서도 기록된다, RUN-006).

// restoring: 앱 시작 때 저장된 세션을 확인하는 중(splash 유지)
export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

const REFRESH_KEY = 'dallimo.auth.refreshToken';
// 이 시간 안에 만료되는 Access Token은 요청 전에 새로 받는다
const REFRESH_AHEAD_MS = 60_000;

let status: AuthStatus = 'restoring';
let accessToken: string | null = null;
let accessExpiresAt = 0;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function set(next: AuthStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

async function adopt(session: AuthSession) {
  accessToken = session.tokens.accessToken;
  accessExpiresAt = session.tokens.accessTokenExpiresAt;
  // 새 Refresh Token을 먼저 저장한다 (옛 토큰은 서버에서 곧 쓸 수 없게 된다)
  await setItem(REFRESH_KEY, session.tokens.refreshToken);
}

async function clearSession() {
  accessToken = null;
  accessExpiresAt = 0;
  await removeItem(REFRESH_KEY);
  set('signedOut');
}

/**
 * Refresh Token으로 새 토큰을 받는다. 동시에 불려도 서버에는 한 번만 보낸다.
 * 세션이 끝났으면 로그아웃 상태로 바꾸고 null. 서버에 닿지 못하면 AuthError('network').
 */
function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await getItem(REFRESH_KEY);
      if (!refreshToken) {
        await clearSession();
        return null;
      }
      const session = await authRepository.refresh(refreshToken, await getDeviceId());
      await adopt(session);
      return session.tokens.accessToken;
    } catch (e) {
      if (e instanceof AuthError && e.kind === 'unauthorized') {
        await clearSession();
        return null;
      }
      throw e;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** 지금 쓸 수 있는 Access Token. 곧 만료되면 먼저 새로 받는다 */
export async function getAccessToken(): Promise<string | null> {
  if (status === 'signedOut') return null;
  if (accessToken && Date.now() < accessExpiresAt - REFRESH_AHEAD_MS) return accessToken;
  return refreshSession().catch(() => accessToken);
}

registerAuthHooks({
  getAccessToken,
  refreshAccessToken: () => refreshSession().catch(() => null),
  onUnauthorized: () => {
    // 이미 로그아웃 중이면 무시
    if (status === 'signedIn') clearSession();
  },
});

/** AUTH-003 자동 로그인: 저장된 Refresh Token으로 새 토큰을 받는다 */
export async function restoreSession() {
  await Promise.all([loadMockAccounts(), loadPreferences()]);
  if (!(await getItem(REFRESH_KEY))) return set('signedOut');
  try {
    const token = await refreshSession();
    if (token) set('signedIn');
  } catch {
    // 서버에 닿지 못한 것뿐이면 저장된 세션으로 계속한다. 다음 요청 때 다시 새로 받는다.
    set('signedIn');
  }
}

/** 이메일 · 비밀번호 로그인 */
export async function logIn(email: string, password: string) {
  await adopt(await authRepository.login(email.trim(), password, await getDeviceId()));
  set('signedIn');
}

/** 이메일 · 비밀번호 · 닉네임 가입. 가입하면 바로 로그인된다 */
export async function signUp(input: SignupInput) {
  await adopt(await authRepository.signup({ ...input, email: input.email.trim(), nickname: input.nickname.trim() }, await getDeviceId()));
  set('signedIn');
}

/** 비밀번호 변경. 이 기기는 로그인이 이어진다(서버가 이 세션만 남기고 다른 기기를 로그아웃시킨다) */
export function changePassword(currentPassword: string, newPassword: string) {
  return authRepository.changePassword(currentPassword, newPassword);
}

// AUTH-004 "진행 중 러닝 보호": 달리는 중에는 로그아웃 · 탈퇴하지 않는다
export function hasRunInProgress(): boolean {
  const s = getActiveRun()?.getSnapshot().status;
  return s != null && s !== 'FINISHED' && s !== 'CANCELED';
}

/** AUTH-004 로그아웃. 서버에 닿지 못해도 기기의 세션은 지운다 */
export async function signOut() {
  await authRepository.logout().catch(() => undefined);
  await clearSession();
  // 같은 기기를 다른 사람이 쓸 수 있어 최근 검색도 지운다 (결정 로그 54항)
  await clearRecentSearches();
}

/** AUTH-004 탈퇴. 서버 처리가 끝나야 세션을 지운다 */
export async function withdraw() {
  await authRepository.withdraw();
  await clearSession();
  await clearRecentSearches();
}
