import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { MapBaseLayer } from '@/components/MapBaseLayer';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';

// 62.2장: 러닝 중 지도는 상세 탐색용이 아니라 경로 확인/이탈 판단용. 어두운 지도 위에 지나온 길(흰 선)과 내 위치만 그린다.
// 코스 러닝이면 기준 코스(두꺼운 민트 + 번짐)를 아래에 깔아 실제 경로(가는 흰 선)와 색·굵기 둘 다로 구분한다 (CRUN-001, CLAUDE.md 8항).
// 지도 SDK 결정 전 placeholder이며 SDK 도입 시 구현만 바꾼다.
const MIN_SPAN_M = 600;

// ghost: 124장 고스트의 코스 위 자리 (PB 어택 · 도전). 속이 빈 점선 원이라 내 위치(속이 찬 흰 점)와 모양으로 구분한다
export function RunPathMap({
  path,
  position,
  course = null,
  ghost = null,
}: {
  path: GeoPoint[];
  position: GeoPoint | null;
  course?: GeoPoint[] | null;
  ghost?: GeoPoint | null;
}) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const pts = position ? [...path, position] : path;
  const { width, height } = size;
  // 코스가 있으면 코스 전체와 내 위치가 들어오게, 없으면 내 위치 둘레
  const frame = course && course.length > 1 ? [course, ...(position ? [[position]] : [])] : pts.length ? [pts, span(pts[pts.length - 1])] : [];
  const project = width > 0 && frame.length > 0 ? makeProjection(frame, width, height, spacing.xxxl) : null;
  const courseLine = project && course ? course.map(project).map((p) => p.join(',')).join(' ') : null;
  const end = project && course && course.length > 1 ? project(course[course.length - 1]) : null;
  const line = project ? pts.map(project).map((p) => p.join(',')).join(' ') : '';
  const me = project && position ? project(position) : null;
  const ghostAt = project && ghost ? project(ghost) : null;
  const start = project && path.length ? project(path[0]) : null;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={course ? `기준 코스와 지나온 경로, 내 위치${ghost ? ', 고스트' : ''} 지도` : '지나온 경로와 내 위치 지도'}
      style={[styles.root, { backgroundColor: colors.mapBase.land }]}
    >
      {project ? (
        <Svg width={width} height={height}>
          <MapBaseLayer base={MOCK_MAP_BASE} project={project} />
          {courseLine ? (
            <>
              <Polyline points={courseLine} fill="none" stroke={colors.route.course} strokeOpacity={0.22} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
              <Polyline points={courseLine} fill="none" stroke={colors.route.course} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {end ? <Circle cx={end[0]} cy={end[1]} r={7} fill={colors.route.course} stroke={colors.bg.canvas} strokeWidth={3} /> : null}
          {pts.length > 1 ? (
            <Polyline points={line} fill="none" stroke={colors.route.actual} strokeWidth={course ? 3 : 5} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {start ? <Circle cx={start[0]} cy={start[1]} r={6} fill={colors.bg.canvas} stroke={colors.route.actual} strokeWidth={3} /> : null}
          {ghostAt ? (
            <Circle cx={ghostAt[0]} cy={ghostAt[1]} r={10} fill={colors.bg.canvas} fillOpacity={0.85} stroke={colors.text.primary} strokeWidth={3} strokeDasharray="4 3" />
          ) : null}
          {/* 코스 러닝에서는 민트 코스 선 위에서도 보이도록 내 위치를 흰 점으로 */}
          {me ? <Circle cx={me[0]} cy={me[1]} r={9} fill={course ? colors.route.actual : colors.action.primary} stroke={colors.bg.canvas} strokeWidth={3} /> : null}
        </Svg>
      ) : null}
      <AppText role="caption" tone="secondary" style={styles.attribution}>
        {MOCK_MAP_BASE.attribution}
      </AppText>
    </View>
  );
}

// 현재 위치 둘레로 최소 범위를 잡아 처음 몇 걸음에서 지도가 과하게 확대되지 않게 한다
function span(c: GeoPoint): GeoPoint[] {
  const dLat = MIN_SPAN_M / 2 / 111_320;
  const dLng = dLat / Math.cos((c.latitude * Math.PI) / 180);
  return [
    { latitude: c.latitude - dLat, longitude: c.longitude - dLng },
    { latitude: c.latitude + dLat, longitude: c.longitude + dLng },
  ];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  attribution: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.sm,
    fontSize: 9,
    lineHeight: 12,
    opacity: 0.8,
  },
});
