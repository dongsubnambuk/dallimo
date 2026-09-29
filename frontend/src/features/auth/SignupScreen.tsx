import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { AuthError } from '@/entities/auth/api/authRepository';
import { EMAIL_MAX, EMAIL_SHAPE, PASSWORD_RULE } from '@/entities/auth/types';
import { getUserRepository } from '@/entities/user/api';
import { checkNicknameLocal, NICKNAME_MAX } from '@/entities/user/api/mockUserRepository';
import type { NicknameCheck } from '@/entities/user/types';

import { AuthFrame } from './AuthFrame';
import { AuthField, type FieldStatus } from './components/AuthField';
import { nicknameStatus } from './ProfileForm';
import { signUp } from './session';

// 회원가입: 이메일 · 비밀번호 · 닉네임 (사용자 결정, FOUNDATION-DECISION-LOG 30항). 가입하면 바로 로그인되어 탐색으로 간다.
// 닉네임은 랭킹 · 함께 달리기에서 보이는 이름이라 가입 때 받는다(전에는 가입 뒤 프로필 설정 SCR-A02에서 받았다).
export function SignupScreen() {
  return (
    <AuthFrame>
      <Signup />
    </AuthFrame>
  );
}

function Signup() {
  const { colors } = useTheme();
  const repo = useMemo(() => getUserRepository(), []);
  const passwordRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, nickname: false });
  const [serverError, setServerError] = useState<{ field: 'email' | 'nickname' | 'form'; copy: string } | null>(null);
  const [pending, setPending] = useState(false);

  // 닉네임은 입력을 멈추면 쓸 수 있는지 물어본다
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(nickname.trim()), 400);
    return () => clearTimeout(t);
  }, [nickname]);
  const trimmedNick = nickname.trim();
  const localNick = checkNicknameLocal(nickname);
  const nickQuery = useQuery({
    queryKey: ['nickname', 'signup', debounced],
    queryFn: () => repo.checkNickname(debounced),
    enabled: !localNick && debounced === trimmedNick,
    retry: false,
  });
  const nickResult: NicknameCheck | 'checking' = localNick ?? (nickQuery.data && debounced === trimmedNick ? nickQuery.data : 'checking');

  const emailOk = EMAIL_SHAPE.test(email.trim()) && email.trim().length <= EMAIL_MAX;
  const passwordOk = PASSWORD_RULE.test(password);
  const nickOk = nickResult === 'ok' || (nickQuery.isError && !localNick);
  const canSubmit = emailOk && passwordOk && nickOk && !pending;

  const emailStatus: FieldStatus =
    serverError?.field === 'email'
      ? { copy: serverError.copy, icon: 'warning', tone: 'warning' }
      : touched.email && email.length > 0 && !emailOk
        ? { copy: '이메일 형식을 확인해 주세요', icon: 'warning', tone: 'warning' }
        : null;
  const passwordStatus: FieldStatus =
    password.length === 0
      ? { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: null, tone: 'neutral' }
      : passwordOk
        ? { copy: '쓸 수 있는 비밀번호예요', icon: 'check', tone: 'ok' }
        : { copy: '8자 이상, 영문과 숫자를 함께 써 주세요', icon: touched.password ? 'warning' : null, tone: touched.password ? 'warning' : 'neutral' };
  const nickStatus: FieldStatus =
    serverError?.field === 'nickname'
      ? { copy: serverError.copy, icon: 'warning', tone: 'warning' }
      : nickname.length === 0
        ? { copy: '랭킹과 함께 달리기에서 보이는 이름이에요', icon: null, tone: 'neutral' }
        : nicknameStatus(nickResult, touched.nickname);

  const submit = async () => {
    setTouched({ email: true, password: true, nickname: true });
    if (!canSubmit) return;
    setPending(true);
    setServerError(null);
    try {
      await signUp({ email, password, nickname });
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'network';
      setServerError(
        kind === 'emailTaken'
          ? { field: 'email', copy: '이미 가입한 이메일이에요. 로그인해 주세요' }
          : kind === 'nicknameTaken'
            ? { field: 'nickname', copy: '이미 다른 사람이 쓰고 있어요' }
            : kind === 'invalid'
              ? { field: 'form', copy: '입력한 내용을 다시 확인해 주세요.' }
              : { field: 'form', copy: '가입하지 못했어요. 연결을 확인하고 다시 시도해 주세요.' },
      );
      setPending(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <AppPressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="로그인으로 돌아가기" style={styles.back}>
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </AppPressable>
      </View>
      <View style={styles.title}>
        <AppText role="screenTitle">달리모 시작하기</AppText>
        <AppText role="body" tone="secondary">
          이메일로 가입하면 기록과 코스가 계정에 저장돼요.
        </AppText>
      </View>

      <View style={styles.form}>
        <AuthField
          label="이메일"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (serverError?.field === 'email') setServerError(null);
          }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          status={emailStatus}
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
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          status={passwordStatus}
          secret
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => nicknameRef.current?.focus()}
        />
        <AuthField
          ref={nicknameRef}
          label="닉네임"
          value={nickname}
          onChangeText={(v) => {
            setNickname(v);
            setTouched((t) => ({ ...t, nickname: true }));
            if (serverError?.field === 'nickname') setServerError(null);
          }}
          status={nickStatus}
          trailing={`${trimmedNick.length}/${NICKNAME_MAX}`}
          autoComplete="off"
          textContentType="nickname"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {serverError?.field === 'form' ? (
          <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
            <AppIcon name="warning" size={18} color={colors.status.warning} />
            <AppText role="label" style={styles.shrink}>
              {serverError.copy}
            </AppText>
          </View>
        ) : null}

        <SecondaryButton label={pending ? '가입하는 중' : '가입하고 시작하기'} emphasized disabled={!canSubmit} onPress={submit} style={styles.submit} />
        <AppText role="caption" tone="secondary" style={styles.center}>
          가입하면{' '}
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
    </>
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
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
