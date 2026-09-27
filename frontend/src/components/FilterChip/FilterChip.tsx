import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, stroke } from '@/design/tokens';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 95장: 선택 상태를 명확히, 너무 많은 색상은 쓰지 않는다. 선택은 테두리 색과 체크 아이콘으로 함께 표시한다.
export function FilterChip({ label, selected = false, disabled = false, onPress, style }: FilterChipProps) {
  const { colors } = useTheme();

  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.root,
        {
          borderColor: selected ? colors.action.primary : colors.border.subtle,
          backgroundColor: colors.bg.surface,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {selected ? <AppIcon name="check" size={14} color={colors.text.primary} /> : null}
        <AppText role="label" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: stroke.control,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
