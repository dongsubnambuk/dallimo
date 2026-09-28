import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { BrandLoader } from '@/components/Brand';
import { MapBaseLayer } from '@/components/MapBaseLayer';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import { distanceM, makeProjection, pointAt, type GeoPoint } from '@/shared/geo';
import type { MapBase } from '@/shared/map/mockMapBase';

export type CourseRouteMapProps = {
  route: GeoPoint[] | null;
  base?: MapBase;
  height: number;
  // 위 헤더 버튼, 아래 겹치는 시트가 가리는 높이
  obscured: { top: number; bottom: number };
  accessibilityLabel?: string;
};

const MIN_SPAN_M = 900;
const LOOP_M = 60;
const MARKER = 20;

// 코스 상세 상단 지도 (91장 ROUTE MAP). 탐색과 같은 무채색 브랜드 지도 위 형광 민트 경로 + 출발·도착 + 1km 표시.
// 지도 SDK 결정 전 placeholder이며 SDK 도입 시 구현만 바꾼다.
export function CourseRouteMap({ route, base, height, obscured, accessibilityLabel }: CourseRouteMapProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (!route || route.length < 2 || width === 0) {
    return (
      <View onLayout={onLayout} style={[styles.root, styles.center, { height, backgroundColor: colors.mapBase.land }]}>
        {!route ? <BrandLoader size={48} label="경로 불러오는 중" /> : null}
      </View>
    );
  }

  const frame = withMinSpan([route], MIN_SPAN_M);
  const project = makeProjection(frame, width, height, {
    top: obscured.top + spacing.xxxl,
    bottom: obscured.bottom + spacing.xxl,
    left: spacing.xxl,
    right: spacing.xxl,
  });
  const pts = route.map(project).map((p) => p.join(',')).join(' ');
  const start = project(route[0]);
  const end = project(route[route.length - 1]);
  const isLoop = distanceM(route[0], route[route.length - 1]) < LOOP_M;
  const markers = kmMarkers(route, project);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? '코스 경로 지도'}
      onLayout={onLayout}
      style={[styles.root, { height, backgroundColor: colors.mapBase.land }]}
    >
      <Svg width={width} height={height}>
        {base ? <MapBaseLayer base={base} project={project} /> : null}
        <Polyline points={pts} fill="none" stroke={colors.route.course} strokeOpacity={0.28} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts} fill="none" stroke={colors.route.casing} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts} fill="none" stroke={colors.route.course} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        {isLoop ? null : <Circle cx={end[0]} cy={end[1]} r={7} fill={colors.route.casing} stroke={colors.bg.elevated} strokeWidth={3} />}
        <Circle cx={start[0]} cy={start[1]} r={7.5} fill={colors.bg.elevated} stroke={colors.route.casing} strokeWidth={3.5} />
      </Svg>

      {markers.map((m) => (
        <View key={m.km} pointerEvents="none" style={[styles.marker, { left: m.x - MARKER / 2, top: m.y - MARKER / 2, backgroundColor: colors.bg.elevated, borderColor: colors.route.casing }]}>
          <AppText role="caption" tabular style={[styles.markerText, { color: colors.route.casing }]}>
            {m.km}
          </AppText>
        </View>
      ))}

      <View pointerEvents="none" style={[styles.pinAnchor, { left: start[0] - PIN_ANCHOR / 2, top: start[1] - PIN_H - 12 }]}>
        <View style={[styles.pin, { backgroundColor: colors.action.primary, boxShadow: elevation.mapOverlay }]}>
          <AppText role="caption" style={[styles.pinText, { color: colors.action.onPrimary }]}>
            {isLoop ? '출발 · 도착' : '출발'}
          </AppText>
        </View>
      </View>

      {base ? (
        <AppText role="caption" tone="secondary" style={[styles.attribution, { bottom: obscured.bottom + spacing.xs }]}>
          {base.attribution}
        </AppText>
      ) : null}
    </View>
  );
}

// 1km마다 표시. 왕복 코스처럼 같은 자리에 겹치는 표시는 먼저 놓인 것만 남긴다.
function kmMarkers(route: GeoPoint[], project: (p: GeoPoint) => [number, number]) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += distanceM(route[i - 1], route[i]);
  const out: { km: number; x: number; y: number }[] = [];
  for (let km = 1; km * 1000 < total - 150; km++) {
    const [x, y] = project(pointAt(route, (km * 1000) / total));
    if (out.every((m) => Math.hypot(m.x - x, m.y - y) > MARKER + 6)) out.push({ km, x, y });
  }
  return out;
}

function withMinSpan(frame: GeoPoint[][], minM: number): GeoPoint[][] {
  const pts = frame.flat();
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const c = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const dLng = minM / 2 / 111_320 / Math.cos((c.latitude * Math.PI) / 180);
  return [...frame, [{ latitude: c.latitude, longitude: c.longitude - dLng }, { latitude: c.latitude, longitude: c.longitude + dLng }]];
}

const PIN_ANCHOR = 120;
const PIN_H = 24;

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontFamily: fontFamily.black,
    fontSize: 10,
    lineHeight: 12,
  },
  pinAnchor: {
    position: 'absolute',
    width: PIN_ANCHOR,
    alignItems: 'center',
  },
  pin: {
    height: PIN_H,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  pinText: {
    fontFamily: fontFamily.extrabold,
  },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    fontSize: 9,
    lineHeight: 12,
    opacity: 0.8,
  },
});
