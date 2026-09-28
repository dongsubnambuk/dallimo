import { Platform } from 'react-native';

// 실제 기기 위치를 쓰는지. iOS · Android는 실제 위치, 웹(개발 확인용)은 mock 위치와 mock 러너.
// 웹에서 실제 기록 경로를 확인하려면 `/run/active?gps=device`로 연다(브라우저 위치 사용).
export const USES_DEVICE_LOCATION = Platform.OS !== 'web';
