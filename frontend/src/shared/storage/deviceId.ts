import { getItem, setItem } from './keyValueStore';

// 41.1장 deviceId: 설치 단위 식별자. 서버가 기기별 Refresh Token을 관리하는 데 쓴다 (14.1장).
const KEY = 'dallimo.deviceId';
let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  cached = await getItem(KEY);
  if (!cached) {
    cached = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await setItem(KEY, cached);
  }
  return cached;
}
