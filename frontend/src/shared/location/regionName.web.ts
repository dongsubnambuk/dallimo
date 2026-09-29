import type { GeoPoint } from '@/shared/geo';

// 웹(개발 확인용)에는 기기 지오코더가 없다. 지역은 비워 둔다
export async function regionNameAt(_p: GeoPoint): Promise<string | null> {
  return null;
}
