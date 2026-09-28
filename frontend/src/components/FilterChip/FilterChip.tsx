import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  // map: 지도 위에 띄우는 칩(흰 바탕 + 그림자), plain: 화면 위 칩(회색 채움)
  variant?: 'plain' | 'map';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const CHIP_HEIGHT = 36;
// 보이는 높이는 36, 터치 영역은 hitSlop으로 최소 터치 영역(48)을 맞춘다.
const SLOP = (touchTarget.min - CHIP_HEIGHT) / 2;

// 95장: 선택 상태를 명확히, 너무 많은 색상은 쓰지 않는다.
// 레퍼런스: 토스 지도 위 흰 칩, NRC 기간 선택. 선택은 검정 채움 + 체크 아이콘(색만으로 구분하지 않음).
export function FilterChip({ label, selected = false, disabled = false, variant = 'plain', onPress, style }: FilterChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.action.onSecondary : colors.text.primary;
  const bg = selected ? colors.action.secondary : variant === 'map' ? colors.bg.elevated : colors.border.subtle;

  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: SLOP, bottom: SLOP }}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.root, { backgroundColor: bg }, variant === 'map' && { boxShadow: elevation.mapOverlay }, style]}
    >
      <View style={styles.content}>
        {selected ? <AppIcon name="check" size={14} color={fg} /> : null}
        <AppText role="label" numberOfLines={1} style={[styles.label, { color: fg }]}>
          {label}
        </AppText>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: CHIP_HEIGHT,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + spacing.xs,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.bold,
  },
});
