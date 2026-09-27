import type { GeoPoint } from '@/shared/geo';

// 명세서 49.2장 LocationSource 경계 중 탐색 화면에 필요한 부분.
// 러닝 기록용 foreground/background 수신(startForeground, startBackground)은 Running Engine 단계에서 추가한다.
export type LocationPermissionState = 'granted' | 'denied' | 'undetermined';

export interface LocationSource {
  requestPermissions(): Promise<LocationPermissionState>;
  getCurrentPosition(): Promise<GeoPoint>;
}
