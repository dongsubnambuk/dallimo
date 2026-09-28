import { useSyncExternalStore } from 'react';

import { setHapticsEnabled } from './haptics';
import { getJson, setJson } from './storage/keyValueStore';
import { setVoiceEnabled } from './voice';

// SCR-M07 설정 (MY-006) 중 기기에 남기는 값. 앱을 다시 켜도 유지된다.
export type Preferences = {
  // RUN-009 자동 일시정지(P1). 판단 기준(속도/시간)은 필드 테스트 뒤 정한다 (20.2장)
  autoPause: boolean;
  // AUD-001~003 음성 안내
  voice: boolean;
  // ACCESSIBILITY: 햅틱은 끌 수 있어야 한다
  haptics: boolean;
  // 14.2장 Push 이벤트 묶음
  pushLive: boolean;
  pushFriend: boolean;
  pushRecord: boolean;
};

const DEFAULTS: Preferences = { autoPause: false, voice: true, haptics: true, pushLive: true, pushFriend: true, pushRecord: true };
const KEY = 'dallimo.preferences';

let current: Preferences = DEFAULTS;
const listeners = new Set<() => void>();

function apply(p: Preferences) {
  setVoiceEnabled(p.voice);
  setHapticsEnabled(p.haptics);
}

/** 앱 시작 때 한 번 읽는다 */
export async function loadPreferences() {
  current = { ...DEFAULTS, ...((await getJson<Partial<Preferences>>(KEY)) ?? {}) };
  apply(current);
  listeners.forEach((l) => l());
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  current = { ...current, [key]: value };
  apply(current);
  listeners.forEach((l) => l());
  void setJson(KEY, current);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
