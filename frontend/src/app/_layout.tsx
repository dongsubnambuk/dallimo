import { Stack } from 'expo-router';

import { lightTheme, ThemeProvider } from '@/design/theme';

// 앱 기본 컨텍스트는 탐색(light)이다. 러닝 화면은 하위에서 dark ThemeProvider로 감싼다 (110.1장).
export default function RootLayout() {
  return (
    <ThemeProvider scheme="light">
      <Stack screenOptions={{ contentStyle: { backgroundColor: lightTheme.colors.bg.canvas } }} />
    </ThemeProvider>
  );
}
