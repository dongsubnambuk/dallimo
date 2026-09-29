import { Redirect, Stack } from 'expo-router';

import { GpsPocScreen } from '@/features/gps-poc/GpsPocScreen';
import { GPS_POC_ENABLED } from '@/features/gps-poc/pocFlag';

// GPS PoC 기록 확인 (개발 빌드 · PoC 테스트 빌드에서만)
export default function GpsPocRoute() {
  if (!GPS_POC_ENABLED) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: 'GPS PoC 기록' }} />
      <GpsPocScreen />
    </>
  );
}
