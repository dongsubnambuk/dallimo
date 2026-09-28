// GPS PoC 화면을 여는지. 개발 빌드이거나, 야외 테스트용 빌드를 EXPO_PUBLIC_GPS_POC=1로 만든 경우.
// 야외 테스트는 노트북 없이 달려야 해서 JS를 앱에 넣은 Release 빌드로 한다 (docs/test/gps-poc.md).
export const GPS_POC_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_GPS_POC === '1';
