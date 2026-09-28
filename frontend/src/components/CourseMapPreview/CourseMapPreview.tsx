import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import { makeProjection, pointAt, sliceRoute, type GeoPoint } from '@/shared/geo';

export type { GeoPoint } from '@/shared/geo';

export type RouteAnnotation = {
  // 경로 시작점부터의 진행 비율 0~1
  at: number;
  label: string;
  tone?: 'course' | 'target' | 'danger';
};

export type CourseMapPreviewProps = {
  route: GeoPoint[];
  // 실제 달린 경로. 있으면 route 위에 겹쳐 그린다.
  actual?: GeoPoint[];
  // 이탈 구간 (actual 기준 진행 비율)
  deviation?: { from: number; to: number };
  // 주변 다른 코스. 흐리게 그린다 (탐색 화면).
  others?: GeoPoint[][];
  annotations?: RouteAnnotation[];
  startLabel?: string;
  // 지도 위 거리 표시. 예: "5.1 km"
  badge?: string;
  loading?: boolean;
  height: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD = 28;

// 명세서 67.1장 CourseMapPreview (loading, route, actual, deviation).
// 레퍼런스 P1·P3: 코스는 지도 위 경로 선 + 출발/도착 표시 + 경로 위 라벨로 보인다.
// 지도 SDK 결정 전이므로 배경 지도 없이 경로 geometry만 그린다 (97장: 정적 이미지로 지도를 흉내 내지 않는다).
// route / actual / target은 색뿐 아니라 굵기·점선으로도 구분한다 (8항 Maps).
export function CourseMapPreview({
  route,
  actual,
  deviation,
  others = [],
  annotations = [],
  startLabel = '출발',
  badge,
  loading = false,
  height,
  accessibilityLabel,
  style,
}: CourseMapPreviewProps) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const background = colors.mapBase.land;
  // 밝은 바탕에서는 민트 선이 묻히지 않게 검정 테두리를 두른다 (signal line 공통 규칙)
  const cased = scheme === 'light';
  const pin = cased ? colors.route.casing : colors.route.course;

  if (loading || route.length < 2) {
    return (
      <View
        accessible
        accessibilityLabel="경로 불러오는 중"
        accessibilityState={{ busy: true }}
        style={[styles.root, { height, backgroundColor: background }, styles.center, style]}
      >
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }

  const project = makeProjection([route, ...(actual ? [actual] : []), ...others], width, height, PAD);
  const toPoints = (pts: GeoPoint[]) => pts.map((p) => project(p).join(',')).join(' ');
  const start = project(route[0]);
  const end = project(route[route.length - 1]);
  const deviationPts = actual && deviation ? sliceRoute(actual, deviation.from, deviation.to) : null;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? '코스 경로'}
      accessibilityRole="image"
      onLayout={onLayout}
      style={[styles.root, { height, backgroundColor: background }, style]}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            {others.map((o, i) => (
              <Polyline key={i} points={toPoints(o)} fill="none" stroke={colors.border.strong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {/* 코스 기준선: 가장 굵은 signal 선 */}
            {cased ? (
              <Polyline points={toPoints(route)} fill="none" stroke={colors.route.casing} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            <Polyline points={toPoints(route)} fill="none" stroke={colors.route.course} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            {actual ? (
              <Polyline points={toPoints(actual)} fill="none" stroke={colors.route.actual} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {deviationPts ? (
              <Polyline points={toPoints(deviationPts)} fill="none" stroke={colors.status.danger} strokeWidth={4} strokeDasharray="6 5" strokeLinecap="round" />
            ) : null}
            <Circle cx={end[0]} cy={end[1]} r={6} fill={pin} />
            <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.elevated} stroke={pin} strokeWidth={3} />
            {annotations.map((a, i) => {
              const p = project(pointAt(route, a.at));
              return <Circle key={i} cx={p[0]} cy={p[1]} r={6} fill={toneColor(a.tone, colors)} stroke={colors.bg.elevated} strokeWidth={2} />;
            })}
          </Svg>
          <Tag x={start[0]} y={start[1]} text={startLabel} fill={colors.route.course} ink={colors.action.onPrimary} />
          {annotations.map((a, i) => {
            const p = project(pointAt(route, a.at));
            return <Tag key={i} x={p[0]} y={p[1]} text={a.label} fill={colors.bg.elevated} ink={colors.text.primary} dot={toneColor(a.tone, colors)} />;
          })}
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay }]}>
              <AppText role="label" tabular>
                {badge}
              </AppText>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// 경로 위 말풍선 라벨 (레퍼런스 P3: "출발", "오늘의 나", "PB")
function Tag({ x, y, text, fill, ink, dot }: { x: number; y: number; text: string; fill: string; ink: string; dot?: string }) {
  return (
    // 폭을 고정한 투명 컨테이너로 점 위 가운데에 맞춘다
    <View pointerEvents="none" style={[styles.tagAnchor, { left: x - TAG_ANCHOR / 2, top: y }]}>
      <View style={[styles.tag, { backgroundColor: fill, boxShadow: elevation.mapOverlay }]}>
        {dot ? <View style={[styles.tagDot, { backgroundColor: dot }]} /> : null}
        <AppText role="caption" style={[styles.tagText, { color: ink }]} numberOfLines={1}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

function toneColor(tone: RouteAnnotation['tone'], colors: ReturnType<typeof useTheme>['colors']) {
  if (tone === 'target') return colors.route.target;
  if (tone === 'danger') return colors.status.danger;
  return colors.route.course;
}

const TAG_HEIGHT = 22;
const TAG_ANCHOR = 160;

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  tagAnchor: {
    position: 'absolute',
    width: TAG_ANCHOR,
    marginTop: -TAG_HEIGHT - 10,
    alignItems: 'center',
  },
  tag: {
    height: TAG_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: fontFamily.bold,
  },
});
