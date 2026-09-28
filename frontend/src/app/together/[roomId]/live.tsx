import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider } from '@/design/theme';
import { PendingScreen } from '@/features/pending/PendingScreen';

// SCR-T04 Live Run은 72장 11번(Together Live) 단계. 그 전까지 출발 뒤 흐름만 확인한다.
export default function TogetherLiveRoute() {
  return (
    <ThemeProvider scheme="dark">
      <StatusBar style="light" />
      <PendingScreen title="함께 달리는 중" order="Together Live 단계(72장 11번)" action={{ label: '함께 달리기로', onPress: () => router.dismissTo('/together') }} />
    </ThemeProvider>
  );
}
