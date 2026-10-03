import { useSyncExternalStore } from 'react';

import { setHapticsEnabled } from './haptics';
import { getJson, setJson } from './storage/keyValueStore';
import { setVoiceEnabled } from './voice';

// SCR-M07 설정 (MY-006) 중 기기에 남기는 값. 앱을 다시 켜도 유지된다.
export type Preferences = {
  // 122장 외부 기록 가져오기: Apple 건강 연결 (연결하면 새 달리기를 찾아 알려 준다)
  healthImport: boolean;
  // WATCH-001: 달리기를 시작하면 Apple Watch에서도 보여 준다 (워치 앱이 설치돼 있을 때)
  watchMirror: boolean;
  // RUN-009 자동 일시정지(P1). 판단 기준(속도/시간)은 필드 테스트 뒤 정한다 (20.2장)
  autoPause: boolean;
  // AUD-001~003 음성 안내
  voice: boolean;
  // AUD-003 구간 안내 빈도(km). 0이면 끔
  voiceSplitKm: 0 | 1 | 2;
  // AUD-002 경쟁 안내: 목표보다 앞섬 · 뒤처짐, 순위 변화, 남은 시간, 친구 완주
  voiceCompetition: boolean;
  // ACCESSIBILITY: 햅틱은 끌 수 있어야 한다
  haptics: boolean;
  // 14.2장 Push 이벤트 묶음. 서버 알림 설정과 맞춘다 (함께 달리기는 시작 10분 전 로컬 알림도 포함)
  pushLive: boolean;
  pushFriend: boolean;
  pushRecord: boolean;
  // 달리는 중 로컬 알림 (GPS 약함 · 코스 이탈 · 완주 · 일시정지 방치 · 함께 달리기 연결 끊김)
  runAlerts: boolean;
  // 워치 심박을 러닝 기록에 저장 (건강정보 따로 동의, 결정 로그 65항). 기본은 끔
  heartRateSave: boolean;
  // 블루투스 심박 센서 (심박 벨트 · 심박수 브로드캐스트를 켠 워치, 결정 로그 80항). 달리기를 시작하면 이 센서에 연결한다
  heartSensor: { id: string; name: string } | null;
};

const DEFAULTS: Preferences = { healthImport: false, watchMirror: true, autoPause: false, voice: true, voiceSplitKm: 1, voiceCompetition: true, haptics: true, pushLive: true, pushFriend: true, pushRecord: true, runAlerts: true, heartRateSave: false, heartSensor: null };
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

/** 화면 밖(러닝 엔진 · 알림)에서 지금 값 */
export function getPreferences(): Preferences {
  return current;
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
