import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { formatDuration, formatDurationSpoken } from '@/shared/format';
import { withWaGwa } from '@/shared/korean';

export type GapDirection = 'ahead' | 'behind' | 'tied' | 'noData';

export type GapIndicatorProps = {
  direction: GapDirection;
  // 차이의 크기. 초(unit="sec") 또는 미터(unit="m"). 부호는 direction이 정한다.
  delta?: number;
  unit?: 'sec' | 'm';
  // 비교 대상. 예: "목표", "PB", "선두"
  label: string;
  size?: 'large' | 'compact';
  style?: StyleProp<ViewStyle>;
};

// 88장/95장: ahead/behind를 브랜드 색 하나로 표현하지 않는다. 방향 아이콘 + 숫자 부호 + 문구를 함께 쓴다.
// 부호: 시간은 앞서면 '−'(덜 걸림), 거리는 앞서면 '+'(더 달림). 94장 예시 "+72m"와 같다.
export function GapIndicator({ direction, delta = 0, unit = 'sec', label, size = 'large', style }: GapIndicatorProps) {
  const { colors } = useTheme();

  if (direction === 'noData') {
    return (
      <View accessible accessibilityLabel={`${label} 비교 기록 없음`} style={[styles.root, style]}>
        <AppIcon name="noData" size={16} color={colors.text.secondary} />
        <AppText role="label" tone="secondary">
          {label} 비교 기록 없음
        </AppText>
      </View>
    );
  }

  const magnitude = unit === 'sec' ? formatDuration(Math.abs(delta)) : `${Math.round(Math.abs(delta))}m`;
  const spokenMagnitude = unit === 'sec' ? formatDurationSpoken(delta) : `${Math.round(Math.abs(delta))}미터`;
  const sign =
    direction === 'tied' ? '±' : (direction === 'ahead') === (unit === 'sec') ? '−' : '+';
  const word = direction === 'tied' ? '같음' : direction === 'ahead' ? (unit === 'sec' ? '빠름' : '앞섬') : unit === 'sec' ? '느림' : '뒤처짐';
  const color = direction === 'ahead' ? colors.status.success : direction === 'behind' ? colors.status.danger : colors.text.secondary;
  const icon = direction === 'ahead' ? 'ahead' : direction === 'behind' ? 'behind' : 'tied';
  const copy = direction === 'tied' ? `${withWaGwa(label)} 같음` : `${label}보다 ${word}`;

  return (
    <View
      accessible
      accessibilityLabel={direction === 'tied' ? copy : `${label}보다 ${spokenMagnitude} ${word}`}
      accessibilityLiveRegion="polite"
      style={[styles.root, style]}
    >
      <AppIcon name={icon} size={size === 'large' ? 20 : 16} color={color} />
      <AppText role={size === 'large' ? 'sectionTitle' : 'label'} tabular>
        {sign}
        {direction === 'tied' ? '0' : magnitude}
      </AppText>
      <AppText role="label" tone="secondary" style={styles.copy}>
        {copy}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  copy: {
    flexShrink: 1,
  },
});
