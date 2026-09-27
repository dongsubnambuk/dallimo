import { StyleSheet, Text, type TextProps } from 'react-native';

import { typography, type TextRole } from '../tokens';
import { useTheme } from '../theme';

export type TextTone = 'primary' | 'secondary' | 'inverse' | 'success' | 'warning' | 'danger';

// 112.1장 API의 role은 타이포그래피 역할이다. RN의 ARIA role prop 대신 accessibilityRole을 쓴다.
export type AppTextProps = Omit<TextProps, 'role'> & {
  role?: TextRole;
  tone?: TextTone;
  // 숫자 폭을 고정해 기록/페이스가 바뀔 때 흔들리지 않게 한다.
  tabular?: boolean;
};

export function AppText({ role = 'body', tone = 'primary', tabular, style, maxFontSizeMultiplier, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const { maxFontSizeMultiplier: roleMax, ...roleStyle } = typography[role];
  const color =
    tone === 'primary' || tone === 'secondary' || tone === 'inverse' ? colors.text[tone] : colors.status[tone];

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? roleMax}
      style={[roleStyle, styles.base, { color }, tabular && styles.tabular, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
