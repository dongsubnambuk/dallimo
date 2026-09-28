import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { MapBaseLayer } from '@/components/MapBaseLayer';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';

// 62.2장: 러닝 중 지도는 상세 탐색용이 아니라 경로 확인용. 어두운 지도 위에 지나온 길(흰 선)과 내 위치만 그린다.
// 지도 SDK 결정 전 placeholder이며 SDK 도입 시 구현만 바꾼다.
const MIN_SPAN_M = 600;

export function RunPathMap({ path, position }: { path: GeoPoint[]; position: GeoPoint | null }) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const pts = position ? [...path, position] : path;
  const { width, height } = size;
  const project = width > 0 && pts.length > 0 ? makeProjection([pts, span(pts[pts.length - 1])], width, height, spacing.xxxl) : null;
  const line = project ? pts.map(project).map((p) => p.join(',')).join(' ') : '';
  const me = project && position ? project(position) : null;
  const start = project && path.length ? project(path[0]) : null;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="지나온 경로와 내 위치 지도"
      style={[styles.root, { backgroundColor: colors.mapBase.land }]}
    >
      {project ? (
        <Svg width={width} height={height}>
          <MapBaseLayer base={MOCK_MAP_BASE} project={project} />
          {pts.length > 1 ? (
            <Polyline points={line} fill="none" stroke={colors.route.actual} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {start ? <Circle cx={start[0]} cy={start[1]} r={6} fill={colors.bg.canvas} stroke={colors.route.actual} strokeWidth={3} /> : null}
          {me ? <Circle cx={me[0]} cy={me[1]} r={9} fill={colors.action.primary} stroke={colors.bg.canvas} strokeWidth={3} /> : null}
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
