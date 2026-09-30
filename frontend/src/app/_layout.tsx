import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { BrandSplash } from '@/components/Brand/BrandSplash';
import { darkTheme, lightTheme, ThemeProvider } from '@/design/theme';
import { fontAssets, fontFamily } from '@/design/tokens';
import { restoreSession, useAuthStatus } from '@/features/auth/session';
import { usePendingShareLink } from '@/features/share/usePendingShareLink';
// 백그라운드 위치 task는 앱이 뜰 때 먼저 등록되어 있어야 한다 (OS가 백그라운드에서 앱을 다시 켤 때 포함)
import '@/tasks/background-location';

SplashScreen.preventAutoHideAsync();

// 앱 기본 컨텍스트는 탐색(light)이다. 러닝 화면은 하위에서 dark ThemeProvider로 감싼다 (110.1장).
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [queryClient] = useState(() => new QueryClient());
  const auth = useAuthStatus();
  const ready = (fontsLoaded || !!fontError) && auth !== 'restoring';
  // 네이티브 스플래시 뒤를 이어 받는 앱 안 스플래시 (한 번만)
  const [splashDone, setSplashDone] = useState(false);

  // AUTH-003: 앱을 켜면 저장된 세션부터 확인한다
  useEffect(() => {
    restoreSession();
  }, []);

  // 로그인 전에 연 공유 · 초대 링크는 로그인한 뒤 이어서 연다
  usePendingShareLink(auth);


  // 로그아웃 · 탈퇴하면 이전 계정의 서버 데이터 캐시를 비운다
  useEffect(() => {
    if (auth === 'signedOut') queryClient.clear();
  }, [auth, queryClient]);

  // 폰트와 세션 확인이 끝날 때까지 splash를 유지한다. 폰트 로드에 실패하면 시스템 폰트로 계속 진행한다.
  // 준비되면 앱 안 스플래시가 같은 모양으로 그려진 뒤 네이티브 스플래시를 내리고, 출발점이 한 바퀴 돈 뒤 사라진다.
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
          {/* 로그인한 사용자만 쓰는 화면 */}
          <Stack.Protected guard={auth === 'signedIn'}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]/index" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]/ranking" options={{ headerShown: false }} />
            {/* REV-001 평가 · CREG-005 신고 */}
            <Stack.Screen name="course/[id]/review" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="course/[id]/report" options={{ headerShown: false, presentation: 'modal' }} />
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
            {/* Together: 방 만들기(light) → 대기실(dark) → Live(dark, 뒤로 밀기 막음) */}
            <Stack.Screen name="together/new" options={{ headerShown: false }} />
            <Stack.Screen name="together/[roomId]/index" options={{ headerShown: false, contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }} />
            <Stack.Screen
              name="together/[roomId]/live"
              options={{ headerShown: false, gestureEnabled: false, animation: 'fade', contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }}
            />
            <Stack.Screen name="together/[roomId]/result" options={{ headerShown: false, animation: 'fade' }} />
            {/* Result는 light로 돌아온다 (89장) */}
            <Stack.Screen name="run/result" options={{ headerShown: false, animation: 'fade' }} />
            {/* My: 러닝 기록 목록 → 러닝 상세 (light) */}
            <Stack.Screen name="my/runs/index" options={{ headerShown: false }} />
            <Stack.Screen name="my/runs/[id]" options={{ headerShown: false }} />
            {/* SCR-M04 내 코스, SCR-E05 코스 등록 */}
            <Stack.Screen name="my/courses/index" options={{ headerShown: false }} />
            <Stack.Screen name="my/friends/index" options={{ headerShown: false }} />
            <Stack.Screen name="my/friends/[userId]" options={{ headerShown: false }} />
            <Stack.Screen name="my/notifications" options={{ headerShown: false }} />
            <Stack.Screen name="my/activity" options={{ headerShown: false }} />
            <Stack.Screen name="training/index" options={{ headerShown: false }} />
            <Stack.Screen name="training/new" options={{ headerShown: false }} />
            <Stack.Screen name="training/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="course/new" options={{ headerShown: false, presentation: 'modal' }} />
            {/* SCR-M07 설정, 프로필 수정 */}
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
            <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
            <Stack.Screen name="settings/password" options={{ headerShown: false }} />
            {/* 122.3장 외부 기록 가져오기 */}
            <Stack.Screen name="import/index" options={{ headerShown: false }} />
            {/* SCR-R05 공유 카드, SHR-004 공유 링크 열기 */}
            <Stack.Screen name="share/compose" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="share/[code]" options={{ headerShown: false, animation: 'fade' }} />
            {/* App Link: 공유 페이지 주소(https://{도메인}/s/{code})를 앱이 바로 열 때 */}
            <Stack.Screen name="s/[code]" options={{ headerShown: false, animation: 'fade' }} />
          </Stack.Protected>
          {/* SCR-A01 로그인 · 회원가입 (dark) */}
          <Stack.Protected guard={auth === 'signedOut'}>
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }} />
            <Stack.Screen name="signup" options={{ headerShown: false, contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }} />
            <Stack.Screen name="password-reset" options={{ headerShown: false, contentStyle: { backgroundColor: darkTheme.colors.bg.canvas } }} />
          </Stack.Protected>
          {/* 약관 · 개인정보 처리방침은 로그인 전에도 본다 */}
          <Stack.Screen name="legal/[kind]" options={{ headerShown: false }} />
        </Stack>
        {splashDone ? null : <BrandSplash onShown={() => SplashScreen.hideAsync()} onDone={() => setSplashDone(true)} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
