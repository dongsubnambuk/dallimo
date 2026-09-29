import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives';
import { useTheme } from '@/design/theme';

// REV-001 평점 별 다섯 개. 채운 별은 accent, 빈 별은 흐린 색 (숫자를 옆에 함께 써서 색만으로 구분하지 않는다)
export function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  const full = Math.round(value);
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4, 5].map((i) => (
        <AppIcon key={i} name="star" size={size} color={i <= full ? colors.text.accent : colors.border.strong} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 1,
  },
});
