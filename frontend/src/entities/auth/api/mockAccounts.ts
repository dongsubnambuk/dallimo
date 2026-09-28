import { getJson, setJson } from '@/shared/storage/keyValueStore';

import type { AuthProvider } from '../types';

// mock 서버의 계정 상태. 새로고침해도 이어지도록 기기에 저장한다. 실제로는 서버 tbl_user.
// 카카오는 기록이 있는 기존 계정(수성러너), Apple · Google은 처음 가입하는 계정으로 흉내 낸다.
export type MockAccount = {
  userId: string;
  provider: AuthProvider;
  nickname: string | null;
  profileImageUrl: string | null;
  friendCode: string;
  // 지난 러닝 기록(mock 히스토리)을 보여줄지
  hasHistory: boolean;
};

type State = { accounts: Record<AuthProvider, MockAccount>; currentUserId: string | null };

const KEY = 'dallimo.mock.accounts';

function initial(): State {
  return {
    accounts: {
      KAKAO: { userId: 'me', provider: 'KAKAO', nickname: '수성러너', profileImageUrl: null, friendCode: 'SUSEONG-7Q2K', hasHistory: true },
      APPLE: { userId: 'u-apple', provider: 'APPLE', nickname: null, profileImageUrl: null, friendCode: 'RUN-4M8P', hasHistory: false },
      GOOGLE: { userId: 'u-google', provider: 'GOOGLE', nickname: null, profileImageUrl: null, friendCode: 'RUN-9X3D', hasHistory: false },
    },
    currentUserId: null,
  };
}

let state: State = initial();
let loaded = false;

export async function loadMockAccounts() {
  if (loaded) return;
  loaded = true;
  state = (await getJson<State>(KEY)) ?? initial();
}

function save() {
  return setJson(KEY, state);
}

export function findAccount(userId: string | null): MockAccount | null {
  return Object.values(state.accounts).find((a) => a.userId === userId) ?? null;
}

/** 지금 로그인한 계정. 로그인 전(개발용 직접 진입)이면 null */
export function currentMockAccount(): MockAccount | null {
  return findAccount(state.currentUserId);
}

export async function signInMockAccount(provider: AuthProvider): Promise<MockAccount> {
  state.currentUserId = state.accounts[provider].userId;
  await save();
  return state.accounts[provider];
}

export async function signOutMockAccount() {
  state.currentUserId = null;
  await save();
}

export async function updateMockAccount(userId: string, patch: Partial<Pick<MockAccount, 'nickname' | 'profileImageUrl'>>) {
  const a = findAccount(userId);
  if (!a) return null;
  Object.assign(a, patch);
  await save();
  return a;
}

// 탈퇴: 계정을 처음 상태로 되돌린다 (다시 가입하면 새 사용자)
export async function withdrawMockAccount(userId: string) {
  const a = findAccount(userId);
  if (a) state.accounts[a.provider] = { ...a, nickname: null, profileImageUrl: null, hasHistory: false };
  state.currentUserId = null;
  await save();
}

export function nicknameTaken(nickname: string, exceptUserId: string | null): boolean {
  const others = ['민수', '하늘', '지수', '도윤', '서연', '러너 박', '달리모'];
  const accounts = Object.values(state.accounts).filter((a) => a.userId !== exceptUserId && a.nickname);
  return others.includes(nickname) || accounts.some((a) => a.nickname === nickname);
}
