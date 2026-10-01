import { useSyncExternalStore } from 'react';

import { getItem, removeItem, setItem } from '@/shared/storage/keyValueStore';

// 온보딩 진행 상태 (사용자 결정, 결정 로그 64항). 기기에 남긴다.
// - 소개: 앱을 처음 켰을 때 로그인 전에 한 번만 보여 준다. 건너뛰거나 끝까지 보면 다시 보이지 않는다
// - 가입 직후 단계(러너 정보 → 권한 안내): 가입하면 시작하고, 끝내거나 건너뛰면 끝난다.
//   가입만 하고 앱을 닫아도 다음에 켜면 이어서 보여 준다. 로그인(이미 있는 계정)은 거치지 않는다

const INTRO_KEY = 'dallimo.onboarding.introSeen';
const PENDING_KEY = 'dallimo.onboarding.pending';

type State = { introSeen: boolean; pending: boolean };

let state: State = { introSeen: false, pending: false };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

/** 앱 시작 때 세션 확인과 함께 한 번 읽는다 */
export async function loadOnboarding() {
  const [intro, pending] = await Promise.all([getItem(INTRO_KEY), getItem(PENDING_KEY)]);
  set({ introSeen: intro === '1', pending: pending === '1' });
}

export function useOnboarding(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function markIntroSeen() {
  set({ introSeen: true });
  void setItem(INTRO_KEY, '1');
}

/** 가입하면 러너 정보 · 권한 안내를 시작한다 */
export async function startOnboarding() {
  await setItem(PENDING_KEY, '1');
  set({ pending: true });
}

/** 끝내거나 건너뛰면 탐색으로 간다 */
export function finishOnboarding() {
  set({ pending: false });
  void removeItem(PENDING_KEY);
}
