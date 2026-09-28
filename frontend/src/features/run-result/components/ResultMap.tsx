import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { MapBaseLayer } from '@/components/MapBaseLayer';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';

// 결과 지도 (RST-001, 93장 ROUTE MAP). 탐색·코스 상세와 같은 밝은 브랜드 지도 위에
// 기준 코스(짙은 민트 테두리 + 형광 민트)와 실제로 달린 길(검정 가는 선)을 겹친다. 색과 굵기 둘 다로 구분한다 (CLAUDE.md 8항).
export function ResultMap({ path, course, height }: { path: GeoPoint[]; course: GeoPoint[] | null; height: number }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const sets = [...(course && course.length > 1 ? [course] : []), ...(path.length > 1 ? [path] : [])];
  const project = width > 0 && sets.length ? makeProjection(sets, width, height, spacing.xxl) : null;
  const toPoints = (pts: GeoPoint[]) => (project ? pts.map(project).map((p) => p.join(',')).join(' ') : '');
  const first = path[0] ?? course?.[0] ?? null;
  const last = path[path.length - 1] ?? null;
  const start = project && first ? project(first) : null;
  const end = project && last ? project(last) : null;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={course ? '기준 코스와 달린 경로 지도' : '달린 경로 지도'}
      style={[styles.root, { height, backgroundColor: colors.mapBase.land }]}
    >
      {project ? (
        <Svg width={width} height={height}>
          <MapBaseLayer base={MOCK_MAP_BASE} project={project} />
          {course && course.length > 1 ? (
            <>
              <Polyline points={toPoints(course)} fill="none" stroke={colors.route.casing} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
              <Polyline points={toPoints(course)} fill="none" stroke={colors.route.course} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {path.length > 1 ? (
            <Polyline points={toPoints(path)} fill="none" stroke={colors.route.actual} strokeWidth={course ? 2.5 : 5} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {end ? <Circle cx={end[0]} cy={end[1]} r={6} fill={colors.route.actual} stroke={colors.bg.elevated} strokeWidth={2.5} /> : null}
          {start ? <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.elevated} stroke={colors.route.casing} strokeWidth={3.5} /> : null}
        </Svg>
      ) : null}
      <AppText role="caption" tone="secondary" style={styles.attribution}>
        {MOCK_MAP_BASE.attribution}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.xs,
    fontSize: 9,
    lineHeight: 12,
    opacity: 0.8,
  },
});
