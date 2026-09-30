import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { AuthError } from '@/entities/auth/api/authRepository';
import { PASSWORD_RULE } from '@/entities/auth/types';
import { AuthField, type FieldStatus } from '@/features/auth/components/AuthField';
import { changePassword } from '@/features/auth/session';

// 비밀번호 바꾸기 (설정 > 계정, 결정 로그 58항). 지금 비밀번호를 확인하고 바꾼다.
// 이 기기는 로그인이 이어지고 다른 기기는 로그아웃된다. 바뀌었다는 메일이 간다.
export function PasswordChangeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nextRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ field: 'current' | 'form'; copy: string } | null>(null);
  const [done, setDone] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const same = next.length > 0 && next === current;
  const nextOk = PASSWORD_RULE.test(next) && !same;
  const canSubmit = current.length > 0 && nextOk && !pending;

  const currentStatus: FieldStatus = error?.field === 'current' ? { copy: error.copy, icon: 'warning', tone: 'warning' } : null;
  const nextStatus: FieldStatus = same
    ? { copy: '지금 비밀번호와 다르게 정해 주세요', icon: 'warning', tone: 'warning' }
    : next.length === 0
      ? { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: null, tone: 'neutral' }
      : nextOk
        ? { copy: '쓸 수 있는 비밀번호예요', icon: 'check', tone: 'ok' }
        : { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: touched ? 'warning' : null, tone: touched ? 'warning' : 'neutral' };

  const submit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'network';
      setError(
        kind === 'passwordMismatch'
          ? { field: 'current', copy: '지금 비밀번호가 맞지 않아요' }
          : kind === 'invalid' && e instanceof AuthError
            ? { field: 'form', copy: e.message }
            : { field: 'form', copy: '바꾸지 못했어요. 연결을 확인하고 다시 시도해 주세요.' },
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          비밀번호 바꾸기
        </AppText>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <AppIcon name="check" size={32} color={colors.status.success} />
            <AppText role="sectionTitle">비밀번호를 바꿨어요</AppText>
            <AppText role="body" tone="secondary" style={styles.center}>
              이 휴대폰은 로그인이 그대로예요. 다른 기기에서는 새 비밀번호로 다시 로그인해 주세요.
            </AppText>
            <SecondaryButton label="확인" emphasized onPress={back} style={styles.submit} />
          </View>
        ) : (
          <View style={styles.form}>
            <AuthField
              label="지금 비밀번호"
              value={current}
              onChangeText={(v) => {
                setCurrent(v);
                if (error) setError(null);
              }}
              status={currentStatus}
              secret
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => nextRef.current?.focus()}
            />
            <AuthField
              ref={nextRef}
              label="새 비밀번호"
              value={next}
              onChangeText={(v) => {
                setNext(v);
                if (error?.field === 'form') setError(null);
              }}
              onBlur={() => setTouched(true)}
              status={nextStatus}
              secret
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error?.field === 'form' ? (
              <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
                <AppIcon name="warning" size={18} color={colors.status.warning} />
                <AppText role="label" style={styles.shrink}>
                  {error.copy}
                </AppText>
              </View>
            ) : null}
            <SecondaryButton label={pending ? '바꾸는 중' : '비밀번호 바꾸기'} emphasized disabled={!canSubmit} onPress={submit} style={styles.submit} />
            <AppText role="caption" tone="secondary">
              바꾸면 다른 기기에서는 로그아웃되고, 가입한 이메일로 알림 메일이 가요.
            </AppText>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  done: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  center: {
    textAlign: 'center',
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
});
