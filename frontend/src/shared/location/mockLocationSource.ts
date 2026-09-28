import type { GeoPoint } from '@/shared/geo';

import type { GpsQuality, LocationPermissionState, LocationSource } from './locationSource';

// expo-location 연동 전 mock. 실제 구현은 GPS PoC(WBS 1) 단계에서 같은 인터페이스로 교체한다.
// 수성못 북동쪽 입구 근처
export const MOCK_POSITION: GeoPoint = { latitude: 35.8286, longitude: 128.6219 };

// 처음 켰을 때 GPS를 잡는 데 걸리는 시간 흉내
const ACQUIRE_MS = 1500;

export type MockLocationOptions = {
  position?: GeoPoint;
  // 고정 품질. 없으면 처음 ACQUIRE_MS 동안 'acquiring' 뒤 'good'.
  quality?: GpsQuality;
};

export function createMockLocationSource(permission: LocationPermissionState, options: MockLocationOptions = {}): LocationSource {
  const createdAt = Date.now();
  return {
    async requestPermissions() {
      return permission;
    },
    async getCurrentPosition() {
      if (permission !== 'granted') throw new Error('location permission not granted');
      return options.position ?? MOCK_POSITION;
    },
    async getCurrentQuality() {
      if (permission !== 'granted') return 'unavailable';
      if (options.quality) return options.quality;
      return Date.now() - createdAt < ACQUIRE_MS ? 'acquiring' : 'good';
    },
  };
}
