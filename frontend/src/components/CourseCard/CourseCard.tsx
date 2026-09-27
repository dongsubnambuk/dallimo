import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, stroke, typography } from '@/design/tokens';
import { formatDistanceKm } from '@/shared/format';

export type CourseCardProps = {
  title: string;
  distanceM: number;
  tags?: string[];
  // 내 위치에서 코스 시작점까지 거리
  proximityM?: number;
  // 예: "내 PB 25:42 · 주간 18위"
  recordContext?: string;
  selected?: boolean;
  variant?: 'default' | 'compact';
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 113장: course identity > distance > metadata.
// 88.2장/95장: 떠 있는 카드가 아니라 간격과 경계로 구분하고, thumbnail 없는 버전이 기본이다.
export function CourseCard({
  title,
  distanceM,
  tags = [],
  proximityM,
  recordContext,
  selected = false,
  variant = 'default',
  loading = false,
  onPress,
  style,
}: CourseCardProps) {
  const { colors } = useTheme();
  const compact = variant === 'compact';

  if (loading) {
    return <CourseCardSkeleton compact={compact} style={style} />;
  }

  const distance = `${formatDistanceKm(distanceM, 1)} km`;
  const meta = [distance, ...tags].join(' · ');
  const proximity = proximityM != null ? `내 위치에서 ${formatDistanceKm(proximityM, 1)} km` : null;

  return (
    <AppPressable
      onPress={onPress}
      accessibilityState={{ selected }}
      accessibilityLabel={[title, meta, proximity, recordContext, selected ? '선택됨' : null].filter(Boolean).join(', ')}
      style={[
        styles.root,
        compact && styles.compact,
        { borderLeftColor: selected ? colors.action.primary : 'transparent' },
        selected && { backgroundColor: colors.bg.surface },
        style,
      ]}
    >
      <AppText role="sectionTitle" numberOfLines={compact ? 1 : 2}>
        {title}
      </AppText>
      <AppText role="body" tabular numberOfLines={compact ? 1 : 2}>
        {meta}
      </AppText>
      {!compact && proximity ? (
        <AppText role="caption" tone="secondary" tabular>
          {proximity}
        </AppText>
      ) : null}
      {!compact && recordContext ? (
        <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
          {recordContext}
        </AppText>
      ) : null}
    </AppPressable>
  );
}

function CourseCardSkeleton({ compact, style }: { compact: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const bar = { backgroundColor: colors.border.subtle, borderRadius: radius.control };

  return (
    <View
      accessible
      accessibilityLabel="코스 불러오는 중"
      accessibilityState={{ busy: true }}
      style={[styles.root, compact && styles.compact, { borderLeftColor: 'transparent' }, style]}
    >
      {/* 76장: skeleton은 실제 content geometry와 비슷하게 둔다 */}
      <View style={[bar, { height: typography.sectionTitle.lineHeight, width: '70%' }]} />
      <View style={[bar, { height: typography.body.lineHeight, width: '45%' }]} />
      {!compact ? <View style={[bar, { height: typography.caption.lineHeight, width: '35%' }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: stroke.signal,
  },
  compact: {
    paddingVertical: spacing.sm,
  },
});
