import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { AuthError } from '@/entities/auth/api/authRepository';
import { EMAIL_MAX, EMAIL_SHAPE, PASSWORD_RULE } from '@/entities/auth/types';

import { AuthFrame } from './AuthFrame';
import { AuthField, type FieldStatus } from './components/AuthField';
import { logIn, requestPasswordReset, resetPassword } from './session';

// 비밀번호 재설정 (로그인 > "비밀번호를 잊었어요", 결정 로그 58항).
// 1단계: 이메일 → 인증 코드 6자리를 메일로 받는다. 2단계: 코드 + 새 비밀번호 → 바꾸고 바로 로그인.
// 가입하지 않은 이메일도 같은 안내를 보여 준다 (가입 여부 노출 방지, 결정 로그 30항 로그인 실패와 같은 이유).
const RESEND_AFTER_S = 60;
const CODE_SHAPE = /^\d{6}$/;

export function PasswordResetScreen() {
  return (
    <AuthFrame>
      <Reset />
    </AuthFrame>
  );
}

type FormError = { field: 'code' | 'form'; copy: string } | null;

function Reset() {
  const { colors } = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError>(null);
  // 코드를 다시 받을 수 있을 때까지 남은 초 (서버도 60초 안의 재요청은 보내지 않는다)
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const emailOk = EMAIL_SHAPE.test(email.trim()) && email.trim().length <= EMAIL_MAX;
  const codeOk = CODE_SHAPE.test(code);
  const passwordOk = PASSWORD_RULE.test(password);

  const sendCode = async () => {
    if (!emailOk || pending) return;
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setStep('code');
      setWait(RESEND_AFTER_S);
    } catch {
      setError({ field: 'form', copy: '코드를 보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.' });
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    setTouched(true);
    if (!codeOk || !passwordOk || pending) return;
    setPending(true);
    setError(null);
    try {
      await resetPassword(email, code, password);
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'network';
      setError(
        kind === 'resetCodeInvalid'
          ? { field: 'code', copy: '코드가 맞지 않거나 시간이 지났어요' }
          : kind === 'invalid'
            ? { field: 'form', copy: '입력한 내용을 다시 확인해 주세요.' }
            : { field: 'form', copy: '바꾸지 못했어요. 연결을 확인하고 다시 시도해 주세요.' },
      );
      setPending(false);
      return;
    }
    try {
      // 성공하면 로그인 상태가 바뀌고 루트 레이아웃이 탐색으로 보낸다
      await logIn(email, password);
    } catch {
      // 비밀번호는 바뀌었다. 로그인 화면에서 새 비밀번호로 다시 로그인한다
      router.replace('/login');
    }
  };

  const codeStatus: FieldStatus =
    error?.field === 'code'
      ? { copy: error.copy, icon: 'warning', tone: 'warning' }
      : touched && !codeOk
        ? { copy: '메일로 받은 숫자 6자리를 넣어 주세요', icon: 'warning', tone: 'warning' }
        : { copy: '10분 안에 넣어 주세요. 5번 틀리면 코드를 다시 받아야 해요', icon: null, tone: 'neutral' };
  const passwordStatus: FieldStatus =
    password.length === 0
      ? { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: null, tone: 'neutral' }
      : passwordOk
        ? { copy: '쓸 수 있는 비밀번호예요', icon: 'check', tone: 'ok' }
        : { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: touched ? 'warning' : null, tone: touched ? 'warning' : 'neutral' };

  const back = () => {
    if (step === 'code') {
      setStep('email');
      setCode('');
      setPassword('');
      setTouched(false);
      setError(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <>
      <View style={styles.header}>
        <AppPressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={step === 'code' ? '이메일 다시 입력하기' : '로그인으로 돌아가기'}
          style={styles.back}
        >
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </AppPressable>
      </View>
      <View style={styles.title}>
        <AppText role="screenTitle" accessibilityRole="header">
          비밀번호 재설정
        </AppText>
        {step === 'email' ? (
          <AppText role="body" tone="secondary">
            가입한 이메일로 인증 코드 6자리를 보내 드려요.
          </AppText>
        ) : (
          <>
            <AppText role="body" style={styles.bold} numberOfLines={1}>
              {email.trim()}
            </AppText>
            <AppText role="body" tone="secondary">
              가입한 이메일이 맞다면 인증 코드가 곧 도착해요. 메일이 안 보이면 스팸함도 확인해 주세요.
            </AppText>
          </>
        )}
      </View>

      {step === 'email' ? (
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
            returnKeyType="go"
            onSubmitEditing={sendCode}
          />
          <FormErrorBox error={error} />
          <SecondaryButton label={pending ? '보내는 중' : '인증 코드 받기'} emphasized disabled={!emailOk || pending} onPress={sendCode} style={styles.submit} />
        </View>
      ) : (
        <View style={styles.form}>
          <AuthField
            label="인증 코드"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              if (error) setError(null);
            }}
            status={codeStatus}
            placeholder="숫자 6자리"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AuthField
            ref={passwordRef}
            label="새 비밀번호"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error?.field === 'form') setError(null);
            }}
            onBlur={() => setTouched(true)}
            status={passwordStatus}
            secret
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <FormErrorBox error={error} />
          <SecondaryButton
            label={pending ? '바꾸는 중' : '비밀번호 바꾸고 로그인'}
            emphasized
            disabled={!codeOk || !passwordOk || pending}
            onPress={submit}
            style={styles.submit}
          />
          <AppText role="caption" tone="secondary" style={styles.center}>
            바꾸면 로그인해 둔 다른 기기에서도 모두 로그아웃돼요.
          </AppText>
          <AppPressable
            onPress={sendCode}
            disabled={wait > 0 || pending}
            accessibilityRole="button"
            accessibilityLabel={wait > 0 ? `코드 다시 받기, ${wait}초 뒤에 할 수 있어요` : '코드 다시 받기'}
            style={styles.resend}
          >
            <AppText role="label" tone="secondary" style={wait > 0 ? null : styles.link}>
              {wait > 0 ? `코드 다시 받기 (${wait}초)` : '코드 다시 받기'}
            </AppText>
          </AppPressable>
        </View>
      )}
    </>
  );
}

function FormErrorBox({ error }: { error: FormError }) {
  const { colors } = useTheme();
  if (error?.field !== 'form') return null;
  return (
    <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
      <AppIcon name="warning" size={18} color={colors.status.warning} />
      <AppText role="label" style={styles.shrink}>
        {error.copy}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    marginLeft: -spacing.sm,
  },
  back: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    gap: spacing.sm,
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
  center: {
    textAlign: 'center',
  },
  resend: {
    alignSelf: 'center',
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
