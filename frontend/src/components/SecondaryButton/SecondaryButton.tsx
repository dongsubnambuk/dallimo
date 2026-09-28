import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

export type SecondaryButtonProps = {
  label: string;
  onPress?: () => void;
  // 흑/백 채움으로 조금 더 강조 (예: "코스 보기", "다시 도전하기")
  emphasized?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

const SM_HEIGHT = 40;

// PrimaryRunButton 옆의 보조 행동. 화면당 핵심 행동(signal 채움)은 PrimaryRunButton 하나만 둔다 (95장).
// 레퍼런스: NRC 검정 알약 버튼(강조), 플랜핏·토스 회색 채움 버튼(기본). 테두리는 쓰지 않는다.
export function SecondaryButton({ label, onPress, emphasized = false, disabled = false, size = 'md', style }: SecondaryButtonProps) {
  const { colors } = useTheme();
  const sm = size === 'sm';
  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={sm ? (touchTarget.min - SM_HEIGHT) / 2 : undefined}
      style={[
        styles.root,
        sm && styles.sm,
        { backgroundColor: emphasized ? colors.action.secondary : colors.border.subtle },
        style,
      ]}
    >
      <AppText
        role={sm ? 'label' : 'sectionTitle'}
        style={[styles.label, { color: emphasized ? colors.action.onSecondary : colors.text.primary }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.pill,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.xl,
  },
  sm: {
    minHeight: SM_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  label: {
    textAlign: 'center',
    fontFamily: fontFamily.bold,
  },
});
