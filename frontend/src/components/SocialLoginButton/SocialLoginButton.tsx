import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { AppPressable, AppText } from '@/design/primitives';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { AuthProvider } from '@/entities/auth/types';

// SCR-A01 소셜 로그인 버튼. 색과 로고는 각 provider 가이드를 따른다(Apple: 검정/흰 로고, Google: 흰 바탕/4색 G,
// 카카오: #FEE500 바탕/검정 말풍선). 브랜드 토큰이 아니라 외부 가이드 값이라 이 컴포넌트 안에만 둔다.
const PROVIDER = {
  APPLE: { label: 'Apple로 계속하기', bg: '#000000', fg: '#FFFFFF', border: '#FFFFFF33' },
  GOOGLE: { label: 'Google로 계속하기', bg: '#FFFFFF', fg: '#1F1F1F', border: '#747775' },
  KAKAO: { label: '카카오로 계속하기', bg: '#FEE500', fg: '#000000D9', border: '#FEE500' },
} as const;

export type SocialLoginButtonProps = {
  provider: AuthProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SocialLoginButton({ provider, onPress, loading = false, disabled = false }: SocialLoginButtonProps) {
  const p = PROVIDER[provider];
  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[styles.root, { backgroundColor: p.bg, borderColor: p.border, opacity: disabled && !loading ? 0.5 : 1 }]}
    >
      <View style={styles.logo}>{loading ? <ActivityIndicator size="small" color={p.fg} /> : <Logo provider={provider} />}</View>
      <AppText role="body" style={[styles.label, { color: p.fg }]}>
        {p.label}
      </AppText>
      {/* 글자가 가운데 오도록 로고 폭만큼 오른쪽을 비운다 */}
      <View style={styles.logo} />
    </AppPressable>
  );
}

function Logo({ provider }: { provider: AuthProvider }) {
  if (provider === 'APPLE') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          fill="#FFFFFF"
          d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        />
      </Svg>
    );
  }
  if (provider === 'GOOGLE') {
    return (
      <Svg width={20} height={20} viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={10.5} rx={10} ry={8} fill="#000000" />
      <Path d="M6.5 16.2 5.6 20.6 10.3 17.6Z" fill="#000000" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 24,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
  },
});
