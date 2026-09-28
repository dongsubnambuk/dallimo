import type { GeoPoint } from '@/shared/geo';

// 명세서 49.2장 LocationSource 경계 중 탐색·러닝 준비에 필요한 부분.
// 러닝 기록용 foreground/background 수신(startForeground, startBackground, stop)은 Running Engine 단계에서 추가한다.
export type LocationPermissionState = 'granted' | 'denied' | 'undetermined';

// LOC-003 러닝 시작 전 GPS 정확도 상태. 정확도(m)를 품질로 나누는 기준(gps.required_accuracy_m)은
// 10.5장 정책값이며 실기기 PoC 전까지 미확정이라 앱 화면에 두지 않고 LocationSource 구현이 판단한다.
export type GpsQuality = 'acquiring' | 'good' | 'fair' | 'poor' | 'unavailable';

export interface LocationSource {
  requestPermissions(): Promise<LocationPermissionState>;
  getCurrentPosition(): Promise<GeoPoint>;
  getCurrentQuality(): Promise<GpsQuality>;
}
