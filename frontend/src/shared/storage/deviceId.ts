import { readItem, setItem } from './keyValueStore';

// 41.1장 deviceId: 설치 단위 식별자. 서버가 기기별 Refresh Token을 관리하는 데 쓴다 (14.1장).
const KEY = 'dallimo.deviceId';
let cached: string | null = null;

// 키체인을 읽지 못하면(StorageUnavailableError) 새로 만들지 않는다. 새 id로 토큰을 새로 받으면 서버가 다른 기기로 보고 세션을 끊는다
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  cached = await readItem(KEY);
  if (!cached) {
    cached = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await setItem(KEY, cached);
  }
  return cached;
}
