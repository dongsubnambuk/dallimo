import type { GeoPoint } from '@/shared/geo';

import type { LocationPermissionState, LocationSource } from './locationSource';

// expo-location 연동 전 mock. 실제 구현은 GPS PoC(WBS 1) 단계에서 같은 인터페이스로 교체한다.
const MOCK_POSITION: GeoPoint = { latitude: 35.8296, longitude: 128.6234 };

export function createMockLocationSource(permission: LocationPermissionState): LocationSource {
  return {
    async requestPermissions() {
      return permission;
    },
    async getCurrentPosition() {
      if (permission !== 'granted') throw new Error('location permission not granted');
      return MOCK_POSITION;
    },
  };
}
