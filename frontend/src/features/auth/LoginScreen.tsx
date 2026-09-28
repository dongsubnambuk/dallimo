import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSymbol, Wordmark } from '@/components/Brand';
import { SocialLoginButton } from '@/components/SocialLoginButton';
import { AppIcon, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import type { LoginScenario } from '@/entities/auth/api/mockAuthRepository';
import type { AuthProvider } from '@/entities/auth/types';

import { ProviderCancelledError } from './providerSignIn';
import { signIn } from './session';

// SCR-A01 로그인 (AUTH-001): Apple / Google / 카카오 버튼, 약관 · 정책 진입.
// 브랜드 첫 화면이라 splash와 같은 dark 바탕에 심볼 · 워드마크 · 짧은 문구만 둔다 (BRAND-AND-PROJECT Short copy).
const PROVIDERS: AuthProvider[] = ['KAKAO', 'APPLE', 'GOOGLE'];

export function LoginScreen({ scenario }: { scenario: LoginScenario }) {
  return (
    <ThemeProvider scheme="dark">
      <Login scenario={scenario} />
    </ThemeProvider>
  );
}

function Login({ scenario }: { scenario: LoginScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [failed, setFailed] = useState(false);

  const login = async (provider: AuthProvider) => {
    setPending(provider);
    setFailed(false);
    try {
      // 성공하면 로그인 상태가 바뀌고 루트 레이아웃이 다음 화면(탐색 또는 프로필 설정)으로 보낸다
      await signIn(provider, scenario);
    } catch (e) {
      if (!(e instanceof ProviderCancelledError)) setFailed(true);
      setPending(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />
      <View style={styles.brand}>
        <BrandSymbol size={88} />
        <Wordmark height={36} />
        <AppText role="body" tone="secondary" style={styles.copy}>
          오늘 달릴 코스를 찾고, 같이 달리고, 기록을 깨다.
        </AppText>
      </View>

      <View style={styles.bottom}>
        {failed ? (
          <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
            <AppIcon name="warning" size={18} color={colors.status.warning} />
            <AppText role="label" style={styles.flexShrink}>
              로그인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
            </AppText>
          </View>
        ) : null}
        {PROVIDERS.map((p) => (
          <SocialLoginButton key={p} provider={p} loading={pending === p} disabled={pending != null && pending !== p} onPress={() => login(p)} />
        ))}
        <AppText role="caption" tone="secondary" style={styles.terms}>
          계속하면{' '}
          <AppText role="caption" style={styles.link} onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'terms' } })} accessibilityRole="link">
            서비스 이용약관
          </AppText>
          과{' '}
          <AppText role="caption" style={styles.link} onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'privacy' } })} accessibilityRole="link">
            개인정보 처리방침
          </AppText>
          에 동의하게 돼요.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  copy: {
    textAlign: 'center',
  },
  bottom: {
    gap: spacing.md,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  terms: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
  flexShrink: {
    flexShrink: 1,
  },
});
