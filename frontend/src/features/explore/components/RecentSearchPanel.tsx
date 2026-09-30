import { ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing, touchTarget } from '@/design/tokens';

// SCR-E02 "최근 검색": 검색창이 비어 있을 때 지도 위, 검색창 바로 아래에 붙는다 (결정 로그 54항).
// 누르면 그 검색어로 다시 찾고, 줄마다 지우기 · 전체 지우기가 있다.
export function RecentSearchPanel({
  items,
  maxHeight,
  onPick,
  onRemove,
  onClear,
}: {
  items: string[];
  // 지도 영역을 넘지 않게 (넘으면 목록이 스크롤된다)
  maxHeight: number;
  onPick: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AppSurface level="elevated" radius="card" style={styles.panel}>
      <View style={styles.head}>
        <AppText role="label" tone="secondary" accessibilityRole="header">
          최근 검색
        </AppText>
        <AppPressable onPress={onClear} accessibilityRole="button" accessibilityLabel="최근 검색 전체 지우기" style={styles.clear}>
          <AppText role="label" tone="secondary">
            전체 지우기
          </AppText>
        </AppPressable>
      </View>
      <ScrollView style={{ maxHeight: Math.max(touchTarget.min, maxHeight - touchTarget.min) }} keyboardShouldPersistTaps="handled">
        {items.map((q) => (
          <View key={q} style={styles.row}>
            <AppPressable onPress={() => onPick(q)} accessibilityRole="button" accessibilityLabel={`${q} 다시 검색`} style={styles.pick}>
              <AppIcon name="time" size={16} color={colors.text.secondary} />
              <AppText role="body" numberOfLines={1} style={styles.text}>
                {q}
              </AppText>
            </AppPressable>
            <AppPressable onPress={() => onRemove(q)} accessibilityRole="button" accessibilityLabel={`${q} 최근 검색에서 지우기`} style={styles.remove}>
              <AppIcon name="close" size={16} color={colors.text.secondary} />
            </AppPressable>
          </View>
        ))}
      </ScrollView>
    </AppSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
  },
  clear: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  text: {
    flexShrink: 1,
  },
  remove: {
    width: touchTarget.min,
    alignItems: 'center',
  },
});
