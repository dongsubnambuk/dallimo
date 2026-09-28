import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 기기에 남기는 작은 값(토큰 · 설정). 14.1장: Refresh Token은 안전한 곳에 둔다 → 앱은 SecureStore(iOS Keychain, Android Keystore).
// 웹에는 SecureStore가 없어 개발 확인용으로 localStorage를 쓴다.
const web = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (web) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // 저장하지 못해도 이번 실행은 계속된다
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (web) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
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

export function setJson(key: string, value: unknown): Promise<void> {
  return setItem(key, JSON.stringify(value));
}
