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
// 왼쪽 route mark(출발점 ─ 도착점)가 선택 상태를 signal line으로 보여준다. 선택된 코스는 지도 route highlight와 연결된다(90장).
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

  const distance = formatDistanceKm(distanceM, 1);
  const secondary = [proximityM != null ? `내 위치에서 ${formatDistanceKm(proximityM, 1)}km` : null, recordContext]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppPressable
      onPress={onPress}
      accessibilityState={{ selected }}
      accessibilityLabel={[title, `${distance}킬로미터`, ...tags, secondary, selected ? '선택됨' : null]
        .filter(Boolean)
        .join(', ')}
      style={[styles.root, compact && styles.compact, selected && { backgroundColor: colors.action.tint }, style]}
    >
      <View style={styles.row}>
        <RouteMark active={selected} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText role="sectionTitle" numberOfLines={compact ? 1 : 2} style={styles.title}>
              {title}
            </AppText>
            <View style={styles.distance}>
              <AppText role="sectionTitle" tabular tone={selected ? 'accent' : 'primary'}>
                {distance}
              </AppText>
              <AppText role="caption" tone="secondary">
                km
              </AppText>
            </View>
          </View>
          {tags.length > 0 ? (
            <AppText role="label" tone="secondary" numberOfLines={1}>
              {tags.join(' · ')}
            </AppText>
          ) : null}
          {!compact && secondary ? (
            <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
              {secondary}
            </AppText>
          ) : null}
        </View>
      </View>
    </AppPressable>
  );
}

// 출발점과 도착점을 잇는 짧은 세로 경로 표시
function RouteMark({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const color = active ? colors.action.primary : colors.border.strong;

  return (
    <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.node, { borderColor: color, backgroundColor: active ? color : 'transparent' }]} />
      <View style={[styles.line, { backgroundColor: color, width: active ? stroke.signal : stroke.control }]} />
      <View style={[styles.node, { borderColor: color, backgroundColor: color }]} />
    </View>
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
      style={[styles.root, compact && styles.compact, style]}
    >
      <View style={styles.row}>
        <View style={styles.mark}>
          <View style={[styles.node, { borderColor: colors.border.subtle }]} />
          <View style={[styles.line, { backgroundColor: colors.border.subtle, width: stroke.control }]} />
          <View style={[styles.node, { borderColor: colors.border.subtle }]} />
        </View>
        {/* 76장: skeleton은 실제 content geometry와 비슷하게 둔다 */}
        <View style={styles.body}>
          <View style={[bar, { height: typography.sectionTitle.lineHeight, width: '65%' }]} />
          <View style={[bar, { height: typography.label.lineHeight, width: '40%' }]} />
          {!compact ? <View style={[bar, { height: typography.caption.lineHeight, width: '55%' }]} /> : null}
        </View>
      </View>
    </View>
  );
}

const NODE = 8;

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  compact: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs / 2,
  },
  mark: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: stroke.control,
  },
  line: {
    flex: 1,
    minHeight: spacing.md,
  },
});
