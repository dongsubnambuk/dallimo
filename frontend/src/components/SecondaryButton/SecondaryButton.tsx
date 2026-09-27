import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';

export type SecondaryButtonProps = {
  label: string;
  onPress?: () => void;
  // signal 연한 배경으로 조금 더 강조 (예: "다시 도전하기")
  emphasized?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

// PrimaryRunButton 옆의 보조 행동. 화면당 핵심 행동(signal 채움)은 PrimaryRunButton 하나만 둔다 (95장).
export function SecondaryButton({ label, onPress, emphasized = false, disabled = false, size = 'md', style }: SecondaryButtonProps) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        styles.root,
        size === 'sm' && styles.sm,
        { backgroundColor: emphasized ? colors.action.tint : colors.bg.surface, borderColor: colors.border.subtle },
        style,
      ]}
    >
      <AppText role={size === 'sm' ? 'label' : 'sectionTitle'} tone={emphasized ? 'accent' : 'primary'} style={styles.center} numberOfLines={1}>
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.control,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
  },
  sm: {
    paddingHorizontal: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
