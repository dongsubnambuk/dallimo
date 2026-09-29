import * as Location from 'expo-location';

import type { GeoPoint } from '@/shared/geo';

// 코스 지역 이름 (CRS-003 지역 검색, 코스 상세 "대구 수성구"). 휴대폰 지오코더로 출발점을 주소로 바꾼다.
// 외부 지도 API 없이 기기 기능만 쓴다. 못 찾으면 null (코스 등록은 그대로 된다).
const METRO = /(특별시|광역시|특별자치시|특별자치도)$/;

export async function regionNameAt(p: GeoPoint): Promise<string | null> {
  try {
    const [a] = await Location.reverseGeocodeAsync(p);
    if (!a) return null;
    const city = (a.city ?? a.region ?? '').replace(METRO, '');
    const district = a.district ?? a.subregion ?? '';
    const name = [city, district].filter(Boolean).join(' ').trim();
    return name ? name.slice(0, 50) : null;
  } catch {
    return null;
  }
}
