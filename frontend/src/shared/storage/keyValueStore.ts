import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 기기에 남기는 작은 값(토큰 · 설정). 14.1장: Refresh Token은 안전한 곳에 둔다 → 앱은 SecureStore(iOS Keychain, Android Keystore).
// 웹에는 SecureStore가 없어 개발 확인용으로 localStorage를 쓴다.
//
// iOS는 앱을 미리 띄우거나(prewarm) 백그라운드에서 깨운다(위치 · 워치 · 알림). 그때 화면이 잠겨 있으면
// "잠금 해제 때만" 키체인 값을 읽지 못한다. 그래서 "기기를 켠 뒤 한 번 잠금 해제했으면" 읽을 수 있게 저장한다 (결정 로그 82항).
// 예전 설정으로 저장된 값은 읽을 수 있을 때 새 곳으로 옮긴다.
const web = Platform.OS === 'web';
// 새 설정 값은 다른 서비스 이름으로 둔다. 예전 값을 지우기 전에 새 값을 먼저 써 둘 수 있다
const OPTIONS: SecureStore.SecureStoreOptions = { keychainService: 'dallimo', keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/** 키체인을 읽지 못했다 (기기를 켠 뒤 아직 잠금 해제하지 않음 등). 값이 없는 것과 다르다 */
export class StorageUnavailableError extends Error {}

/** 값을 읽는다. 읽지 못하면 StorageUnavailableError (값이 없으면 null) */
export async function readItem(key: string): Promise<string | null> {
  try {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    const value = await SecureStore.getItemAsync(key, OPTIONS);
    if (value != null) return value;
    // 예전 설정(기본 서비스 · 잠금 해제 때만)으로 저장된 값: 새 곳에 쓴 뒤 지운다
    const legacy = await SecureStore.getItemAsync(key);
    if (legacy != null) {
      // 옮기지 못하면 다음에 다시 옮긴다 (읽은 값은 그대로 쓴다)
      await SecureStore.setItemAsync(key, legacy, OPTIONS)
        .then(() => SecureStore.deleteItemAsync(key))
        .catch(() => undefined);
    }
    return legacy;
  } catch {
    throw new StorageUnavailableError(key);
  }
}

/** 값을 읽는다. 읽지 못하면 null (없는 것과 같게 본다) */
export async function getItem(key: string): Promise<string | null> {
  try {
    return await readItem(key);
  } catch {
    return null;
  }
}

/** 저장한다. 저장하지 못하면 false */
export async function setItem(key: string, value: string): Promise<boolean> {
  try {
    if (web) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value, OPTIONS);
    return true;
  } catch {
    // 저장하지 못해도 이번 실행은 계속된다
    return false;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (web) globalThis.localStorage?.removeItem(key);
    else {
      await SecureStore.deleteItemAsync(key, OPTIONS);
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // 이미 없거나 지울 수 없는 환경
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
