import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import type { RunSourceInfo } from '@/entities/run/result';

import { sourceBadgeText } from '../labels';

// 122.3장 Source Badge · Imported 표시: 가져온 기록인지 한눈에 (히스토리 · 기록 상세 · 결과)
export function SourceBadge({ source }: { source: RunSourceInfo }) {
  const { colors } = useTheme();
  const text = sourceBadgeText(source);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg.surface }]} accessible accessibilityLabel={text}>
      <AppIcon name={source.device?.toLowerCase().includes('watch') ? 'watch' : 'imported'} size={12} color={colors.text.secondary} />
      <AppText role="caption" tone="secondary" numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
