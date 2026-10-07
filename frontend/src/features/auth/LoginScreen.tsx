import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { BrandSymbol, Wordmark } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { AuthError } from '@/entities/auth/api/authRepository';
import { EMAIL_SHAPE } from '@/entities/auth/types';

import { AuthFrame } from './AuthFrame';
import { AuthField } from './components/AuthField';
import { logIn, takeExpiredNotice } from './session';

// SCR-A01 로그인. 사용자 결정으로 소셜 로그인 대신 이메일 · 비밀번호 (FOUNDATION-DECISION-LOG 30항).
// 브랜드 첫 화면이라 splash와 같은 dark 바탕에 심볼 · 워드마크 · 짧은 문구를 둔다 (BRAND-AND-PROJECT Short copy).
export function LoginScreen() {
  return (
    <AuthFrame>
      <Login />
    </AuthFrame>
  );
}

function Login() {
  const { colors } = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  // 서버가 세션을 끊어 이 화면으로 왔으면 왜 로그인해야 하는지 알려 준다 (결정 로그 82항)
  const [error, setError] = useState<string | null>(() => (takeExpiredNotice() ? '로그인이 만료됐어요. 다시 로그인해 주세요.' : null));

  const canSubmit = EMAIL_SHAPE.test(email.trim()) && password.length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      // 성공하면 로그인 상태가 바뀌고 루트 레이아웃이 탐색으로 보낸다
      await logIn(email, password);
    } catch (e) {
      setError(
        e instanceof AuthError && e.kind === 'invalidCredentials'
          ? '이메일 또는 비밀번호가 맞지 않아요.'
          : e instanceof AuthError && e.kind === 'suspended'
            ? // 서버 안내(문의 페이지 주소 포함)를 그대로 보여 준다 (결정 로그 85항)
              e.message
            : '로그인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
      );
      setPending(false);
    }
  };

  return (
    <>
      <View style={styles.brand}>
        <BrandSymbol size={72} />
        <Wordmark height={32} />
        <AppText role="body" tone="secondary" style={styles.center}>
          오늘 달릴 코스를 찾고, 같이 달리고, 기록을 깨다.
        </AppText>
      </View>

      <View style={styles.form}>
        <AuthField
          label="이메일"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <AuthField
          ref={passwordRef}
          label="비밀번호"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          secret
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? (
          <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
            <AppIcon name="warning" size={18} color={colors.status.warning} />
            <AppText role="label" style={styles.shrink}>
              {error}
            </AppText>
          </View>
        ) : null}
        <SecondaryButton label={pending ? '로그인하는 중' : '로그인'} emphasized disabled={!canSubmit} onPress={submit} style={styles.submit} />
      </View>

      <View style={styles.footer}>
        <AppText role="body" tone="secondary" style={styles.center}>
          처음이세요?{' '}
          <AppText role="body" style={styles.link} accessibilityRole="link" onPress={() => router.push('/signup')}>
            회원가입
          </AppText>
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  shrink: {
    flexShrink: 1,
  },
  submit: {
    alignSelf: 'stretch',
    minHeight: 56,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
