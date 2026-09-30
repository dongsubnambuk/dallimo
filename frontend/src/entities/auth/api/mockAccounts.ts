import { getJson, setJson } from '@/shared/storage/keyValueStore';

// 서버 없이 쓸 때(EXPO_PUBLIC_API_URL 없음)의 가짜 계정 저장소. 새로고침해도 이어지도록 기기에 저장한다.
// 기록이 있는 기존 계정(수성러너)이 하나 들어 있다. 실제 서버는 tbl_user.
export type MockAccount = {
  userId: string;
  email: string;
  password: string;
  nickname: string;
  profileImageUrl: string | null;
  friendCode: string;
  // 지난 러닝 기록(mock 히스토리)을 보여줄지
  hasHistory: boolean;
};

// 개발 확인용 기존 계정
export const DEMO_EMAIL = 'runner@dallimo.app';
export const DEMO_PASSWORD = 'dallimo123';

type State = { accounts: MockAccount[]; currentUserId: string | null };

const KEY = 'dallimo.mock.emailAccounts';

function initial(): State {
  return {
    accounts: [
      { userId: 'me', email: DEMO_EMAIL, password: DEMO_PASSWORD, nickname: '수성러너', profileImageUrl: null, friendCode: 'RUN-7Q2KSU', hasHistory: true },
    ],
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
  return state.accounts.find((a) => a.userId === userId) ?? null;
}

export function findAccountByEmail(email: string): MockAccount | null {
  const e = email.trim().toLowerCase();
  return state.accounts.find((a) => a.email === e) ?? null;
}

/** 지금 로그인한 계정. 로그인 전(개발용 직접 진입)이면 null */
export function currentMockAccount(): MockAccount | null {
  return findAccount(state.currentUserId);
}

export function nicknameTaken(nickname: string, exceptUserId?: string): boolean {
  return state.accounts.some((a) => a.nickname === nickname && a.userId !== exceptUserId);
}

export async function createMockAccount(email: string, password: string, nickname: string): Promise<MockAccount> {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const a: MockAccount = {
    userId: `u-${Date.now().toString(36)}`,
    email: email.trim().toLowerCase(),
    password,
    nickname: nickname.trim(),
    profileImageUrl: null,
    friendCode: `RUN-${code}`,
    hasHistory: false,
  };
  state.accounts.push(a);
  state.currentUserId = a.userId;
  await save();
  return a;
}

export async function setCurrentMockAccount(userId: string | null) {
  state.currentUserId = userId;
  await save();
}

export async function updateMockAccount(userId: string, patch: Partial<Pick<MockAccount, 'nickname' | 'profileImageUrl'>>) {
  const a = findAccount(userId);
  if (!a) return null;
  Object.assign(a, patch);
  await save();
  return a;
}

export async function setMockPassword(userId: string, password: string) {
  const a = findAccount(userId);
  if (!a) return;
  a.password = password;
  await save();
}

// 탈퇴: 계정을 지운다 (같은 이메일로 다시 가입할 수 있다)
export async function removeMockAccount(userId: string) {
  state.accounts = state.accounts.filter((a) => a.userId !== userId);
  state.currentUserId = null;
  await save();
}
