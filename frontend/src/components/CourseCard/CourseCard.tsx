import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, OBLIQUE_SKEW, radius, spacing, stroke, typography } from '@/design/tokens';
import { formatDistanceKm } from '@/shared/format';
import { makeProjection, type GeoPoint } from '@/shared/geo';

export type CourseCardProps = {
  title: string;
  distanceM: number;
  tags?: string[];
  // 내 위치에서 코스 시작점까지 거리
  proximityM?: number;
  // 예: "내 PB 25:42 · 주간 18위"
  recordContext?: string;
  // 예: "이번 주 128명". 코스를 달린 사람 수로 사회적 신호를 준다.
  socialContext?: string;
  // 있으면 왼쪽에 경로 모양을 그린다 (레퍼런스 P7: 목록 항목은 작은 경로 모양 + 제목 + 수치).
  route?: GeoPoint[];
  selected?: boolean;
  variant?: 'default' | 'compact';
  loading?: boolean;
  onPress?: () => void;
  // 누르면 무엇이 일어나는지 스크린 리더에 알려준다
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

// 113장: course identity > distance > metadata.
// 95장: 사진 thumbnail 없는 버전이 기본. 경로 모양은 사진이 아니라 코스 geometry이므로 route가 있을 때만 그린다.
// 레퍼런스 P10: 선택을 채운 상자로 감싸지 않고 경로 색·제목 색으로 표시한다. 선택 코스는 지도 route highlight와 연결된다(90장).
export function CourseCard({
  title,
  distanceM,
  tags = [],
  proximityM,
  recordContext,
  socialContext,
  route,
  selected = false,
  variant = 'default',
  loading = false,
  onPress,
  accessibilityHint,
  style,
}: CourseCardProps) {
  const compact = variant === 'compact';

  if (loading) {
    return <CourseCardSkeleton compact={compact} style={style} />;
  }

  const distance = formatDistanceKm(distanceM, 1);
  const meta = [socialContext, proximityM != null ? `내 위치에서 ${formatDistanceKm(proximityM, 1)}km` : null, recordContext]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppPressable
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      accessibilityLabel={[title, `${distance}킬로미터`, ...tags, meta, selected ? '선택됨' : null].filter(Boolean).join(', ')}
      style={[styles.root, compact && styles.compact, style]}
    >
      <View style={styles.row}>
        {route && route.length > 1 ? (
          <RouteGlyph route={route} active={selected} size={compact ? GLYPH_COMPACT : GLYPH} />
        ) : (
          <RouteMark active={selected} />
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText role="sectionTitle" tone={selected ? 'accent' : 'primary'} numberOfLines={compact ? 1 : 2} style={styles.title}>
              {title}
            </AppText>
            <View style={styles.distance}>
              <AppText role="sectionTitle" tabular tone={selected ? 'accent' : 'primary'} style={styles.distanceValue}>
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
          {!compact && meta ? (
            <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
              {meta}
            </AppText>
          ) : null}
        </View>
      </View>
    </AppPressable>
  );
}

const GLYPH = 56;
const GLYPH_COMPACT = 40;

// 코스 경로 모양 (사진 thumbnail이 아닌 geometry)
function RouteGlyph({ route, active, size }: { route: GeoPoint[]; active: boolean; size: number }) {
  const { colors } = useTheme();
  const project = makeProjection([route], size, size, spacing.sm);
  const pts = route.map(project);
  const color = active ? colors.route.course : colors.text.secondary;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.glyph, { width: size, height: size, backgroundColor: active ? colors.action.tint : colors.border.subtle }]}
    >
      <Svg width={size} height={size}>
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={active ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={pts[0][0]} cy={pts[0][1]} r={3} fill={colors.bg.surface} stroke={color} strokeWidth={2} />
      </Svg>
    </View>
  );
}

// 경로가 없을 때: 출발점과 도착점을 잇는 짧은 세로 표시
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
        <View style={[styles.glyph, bar, { width: compact ? GLYPH_COMPACT : GLYPH, height: compact ? GLYPH_COMPACT : GLYPH }]} />
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs / 2,
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
  // 레퍼런스 P4: 기록·거리 숫자는 굵은 기울임꼴
  distanceValue: {
    fontFamily: fontFamily.extrabold,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  glyph: {
    borderRadius: radius.control,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  mark: {
    alignSelf: 'stretch',
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
