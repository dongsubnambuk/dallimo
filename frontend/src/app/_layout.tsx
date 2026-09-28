import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { darkTheme, lightTheme, ThemeProvider } from '@/design/theme';
import { fontAssets, fontFamily } from '@/design/tokens';

SplashScreen.preventAutoHideAsync();

// 앱 기본 컨텍스트는 탐색(light)이다. 러닝 화면은 하위에서 dark ThemeProvider로 감싼다 (110.1장).
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [queryClient] = useState(() => new QueryClient());
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // 폰트 로드 전에는 splash를 유지한다. 로드에 실패하면 시스템 폰트로 계속 진행한다.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider scheme="light">
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: lightTheme.colors.bg.canvas },
            headerTitleStyle: { fontFamily: fontFamily.bold },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="course/[id]/index" options={{ headerShown: false }} />
          {/* Play Mode는 코스 상세 위 하단 sheet (89장) */}
          <Stack.Screen
            name="course/[id]/play"
            options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* 카운트다운 → Active Run. 러닝 중에는 탭을 가리고 뒤로 밀기로 빠지지 않게 한다 */}
          <Stack.Screen
            name="run/active"
            options={{ headerShown: false, gestureEnabled: false, animation: 'fade', contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }}
          />
          {/* Result는 light로 돌아온다 (89장) */}
          <Stack.Screen name="run/result" options={{ headerShown: false, animation: 'fade' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
