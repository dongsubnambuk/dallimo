import { Redirect, Stack } from 'expo-router';

import { DesignSystemPlayground } from '@/features/design-system-playground/DesignSystemPlayground';

// 110.1장: dev playground는 개발 환경에서만 진입 가능하게 한다. production build에서는 홈으로 돌려보낸다.
export default function DesignSystemScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Design System Playground' }} />
      <DesignSystemPlayground />
    </>
  );
}
