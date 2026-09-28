import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { MapBaseLayer } from '@/components/MapBaseLayer';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';
import type { MapBase } from '@/shared/map/mockMapBase';

export type ReadyMapProps = {
  base: MapBase;
  // 코스 러닝이면 코스 경로. FREE면 null.
  route: GeoPoint[] | null;
  // 내 위치. 권한이 없거나 아직 모르면 null.
  position: GeoPoint | null;
  // 위치를 모를 때 지도 가운데
  fallbackCenter: GeoPoint;
  // 출발점이 멀면 내 위치 → 출발점 점선
  showWayToStart: boolean;
  // GPS를 찾는 중이면 내 위치 표시를 흐리게
  locating: boolean;
  accessibilityLabel: string;
};

// 내 위치만 있을 때 보여줄 최소 범위(m)
const FREE_SPAN_M = 700;
const PULSE_MS = 1800;
const DOT = 16;

// Run Ready 가운데 지도 (89장 dark pre-run canvas). 어두운 지도 위에 코스(민트)·출발점·내 위치만 올린다.
// 지도 SDK 결정 전 placeholder이며 SDK 도입 시 구현만 바꾼다.
export function ReadyMap({ base, route, position, fallbackCenter, showWayToStart, locating, accessibilityLabel }: ReadyMapProps) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  const { width, height } = size;

  const sets: GeoPoint[][] = [];
  if (route) sets.push(route);
  if (position) sets.push([position]);
  if (sets.length === 0) sets.push([fallbackCenter]);
  const frame = withMinSpan(sets, route ? 500 : FREE_SPAN_M);
  const pad = { top: spacing.huge + spacing.lg, bottom: spacing.xxxl, left: spacing.xxl, right: spacing.xxl };
  const project = width > 0 ? makeProjection(frame, width, height, pad) : null;

  const start = route && project ? project(route[0]) : null;
  const me = position && project ? project(position) : null;
  const pts = route && project ? route.map(project).map((p) => p.join(',')).join(' ') : null;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} onLayout={onLayout} style={[styles.root, { backgroundColor: colors.mapBase.land }]}>
      {project ? (
        <Svg width={width} height={height}>
          <MapBaseLayer base={base} project={project} />
          {pts ? (
            <>
              <Polyline points={pts} fill="none" stroke={colors.route.course} strokeOpacity={0.22} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
              <Polyline points={pts} fill="none" stroke={colors.route.course} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {showWayToStart && start && me ? (
            <Line x1={me[0]} y1={me[1]} x2={start[0]} y2={start[1]} stroke={colors.text.primary} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
          ) : null}
          {start ? <Circle cx={start[0]} cy={start[1]} r={8} fill={colors.action.primary} stroke={colors.bg.canvas} strokeWidth={3} /> : null}
        </Svg>
      ) : null}

      {start ? (
        <View pointerEvents="none" style={[styles.pinAnchor, { left: start[0] - PIN_W / 2, top: start[1] - PIN_H - 14 }]}>
          <View style={[styles.pin, { backgroundColor: colors.action.primary }]}>
            <AppText role="caption" style={[styles.pinText, { color: colors.action.onPrimary }]}>
              출발
            </AppText>
          </View>
        </View>
      ) : null}

      {me ? <MyDot x={me[0]} y={me[1]} locating={locating} /> : null}

      <AppText role="caption" tone="secondary" style={styles.attribution}>
        {base.attribution}
      </AppText>
    </View>
  );
}

// 내 위치: 흰 점 + 퍼지는 링. GPS를 찾는 중이면 점을 흐리게 한다. 동작 줄이기 설정이면 링을 멈춘다.
function MyDot({ x, y, locating }: { x: number; y: number; locating: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!reduced) t.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1);
  }, [reduced, t]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1.8 : 1 + t.value * 2.4 }],
    opacity: reduced ? 0.25 : 0.45 * (1 - t.value),
  }));

  return (
    <View pointerEvents="none" style={[styles.dotAnchor, { left: x - DOT / 2, top: y - DOT / 2 }]}>
      <Animated.View style={[styles.ring, { backgroundColor: colors.action.primary }, ring]} />
      <View style={[styles.dot, { backgroundColor: colors.route.actual, borderColor: colors.bg.canvas, opacity: locating ? 0.5 : 1 }]} />
    </View>
  );
}

function withMinSpan(frame: GeoPoint[][], minM: number): GeoPoint[][] {
  const pts = frame.flat();
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const c = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const dLat = minM / 2 / 111_320;
  const dLng = minM / 2 / 111_320 / Math.cos((c.latitude * Math.PI) / 180);
  return [
    ...frame,
    [
      { latitude: c.latitude - dLat, longitude: c.longitude - dLng },
      { latitude: c.latitude + dLat, longitude: c.longitude + dLng },
    ],
  ];
}

const PIN_W = 80;
const PIN_H = 22;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: radius.sheet,
    overflow: 'hidden',
  },
  pinAnchor: {
    position: 'absolute',
    width: PIN_W,
    height: PIN_H,
    alignItems: 'center',
  },
  pin: {
    height: PIN_H,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  pinText: {
    fontFamily: fontFamily.extrabold,
  },
  dotAnchor: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
  },
  attribution: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    fontSize: 9,
    lineHeight: 12,
    opacity: 0.8,
  },
});
