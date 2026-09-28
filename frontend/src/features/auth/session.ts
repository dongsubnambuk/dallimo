import { useSyncExternalStore } from 'react';

import { AuthError } from '@/entities/auth/api/authRepository';
import { loadMockAccounts } from '@/entities/auth/api/mockAccounts';
import { createMockAuthRepository, type LoginScenario } from '@/entities/auth/api/mockAuthRepository';
import type { AuthProvider } from '@/entities/auth/types';
import { getActiveRun } from '@/features/run/engine/activeRunSession';
import { loadPreferences } from '@/shared/preferences';
import { getDeviceId } from '@/shared/storage/deviceId';
import { getItem, removeItem, setItem } from '@/shared/storage/keyValueStore';

import { getProviderCredential } from './providerSignIn';

// 로그인 상태. restoring: 앱 시작 때 저장된 세션을 확인하는 중(splash 유지).
// needsProfile: 처음 가입해서 프로필 설정(SCR-A02)이 남음.
export type AuthStatus = 'restoring' | 'signedOut' | 'needsProfile' | 'signedIn';

const REFRESH_KEY = 'dallimo.auth.refreshToken';
// 가입 뒤 프로필 설정을 끝내기 전에 앱을 닫아도 다시 프로필 설정부터 이어지게 한다
const ONBOARDING_KEY = 'dallimo.auth.onboardingPending';

let status: AuthStatus = 'restoring';
// Access Token은 메모리에만 둔다. 기기에는 Refresh Token만 남긴다 (14.1장)
let accessToken: string | null = null;
const listeners = new Set<() => void>();
const repo = createMockAuthRepository();

function set(next: AuthStatus) {
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

export function getAccessToken() {
  return accessToken;
}

/** AUTH-003 자동 로그인: 저장된 Refresh Token으로 새 토큰을 받는다 */
export async function restoreSession() {
  await Promise.all([loadMockAccounts(), loadPreferences()]);
  const refreshToken = await getItem(REFRESH_KEY);
  if (!refreshToken) return set('signedOut');
  const onboarding = (await getItem(ONBOARDING_KEY)) === 'pending';
  try {
    const tokens = await repo.refresh(refreshToken, await getDeviceId());
    accessToken = tokens.accessToken;
    await setItem(REFRESH_KEY, tokens.refreshToken);
  } catch (e) {
    // 토큰이 폐기됐으면 다시 로그인. 서버에 닿지 못한 것뿐이면 저장된 세션으로 계속한다(러닝은 오프라인에서도 기록된다, RUN-006).
    if (e instanceof AuthError && e.kind === 'unauthorized') {
      await removeItem(REFRESH_KEY);
      return set('signedOut');
    }
  }
  set(onboarding ? 'needsProfile' : 'signedIn');
}

/** AUTH-001 소셜 로그인. 처음 가입이면 프로필 설정으로 간다 */
export async function signIn(provider: AuthProvider, scenario: LoginScenario = 'normal') {
  const credential = await getProviderCredential(provider);
  const r = await (scenario === 'normal' ? repo : createMockAuthRepository(scenario)).socialLogin(provider, credential, await getDeviceId());
  accessToken = r.tokens.accessToken;
  await setItem(REFRESH_KEY, r.tokens.refreshToken);
  if (r.isNewUser) {
    await setItem(ONBOARDING_KEY, 'pending');
    set('needsProfile');
  } else {
    set('signedIn');
  }
}

/** AUTH-002 프로필 설정을 마쳤다 */
export async function completeOnboarding() {
  await removeItem(ONBOARDING_KEY);
  set('signedIn');
}

// AUTH-004 "진행 중 러닝 보호": 달리는 중에는 로그아웃 · 탈퇴하지 않는다
export function hasRunInProgress(): boolean {
  const s = getActiveRun()?.getSnapshot().status;
  return s != null && s !== 'FINISHED' && s !== 'CANCELED';
}

async function clearSession() {
  accessToken = null;
  await removeItem(REFRESH_KEY);
  await removeItem(ONBOARDING_KEY);
  set('signedOut');
}

/** AUTH-004 로그아웃. 서버에 닿지 못해도 기기의 세션은 지운다 */
export async function signOut() {
  const refreshToken = await getItem(REFRESH_KEY);
  await (refreshToken ? repo.logout(refreshToken) : Promise.resolve()).catch(() => undefined);
  await clearSession();
}

/** AUTH-004 탈퇴. 서버 처리가 끝나야 세션을 지운다 */
export async function withdraw() {
  await repo.withdraw();
  await clearSession();
}
