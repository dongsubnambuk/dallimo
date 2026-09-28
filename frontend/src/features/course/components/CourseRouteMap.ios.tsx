import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { BrandMap, CourseLine, Dot, Pin, PinText, regionFor, toLatLng } from '@/components/AppleMap';
import { BrandLoader } from '@/components/Brand';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily } from '@/design/tokens';
import { distanceM, pointAt, type GeoPoint } from '@/shared/geo';

import type { CourseRouteMapProps } from './CourseRouteMap';

const LOOP_M = 60;
const MARKER = 20;

// iOS 코스 상세 상단 지도 (애플 지도, 91장 ROUTE MAP). 형광 민트 코스 + 출발 · 도착 + 1km 표시.
// 스크롤 위에 놓인 지도라 제스처를 끈다 (CLAUDE.md 8항 지도 제스처가 겹친 UI와 충돌하지 않게).
export function CourseRouteMap({ route, height, obscured, accessibilityLabel }: CourseRouteMapProps) {
  const { colors } = useTheme();
  if (!route || route.length < 2) {
    return (
      <View style={[styles.center, { height, backgroundColor: colors.mapBase.land }]}>
        {!route ? <BrandLoader size={48} label="경로 불러오는 중" /> : null}
      </View>
    );
  }
  const isLoop = distanceM(route[0], route[route.length - 1]) < LOOP_M;
  const region = regionFor([route], 900, 1.5);

  return (
    <View style={{ height }}>
      <BrandMap
        interactive={false}
        initialRegion={region ?? undefined}
        padding={{ top: obscured.top, bottom: obscured.bottom, left: 0, right: 0 }}
        accessibilityLabel={accessibilityLabel ?? '코스 경로 지도'}
      >
        <CourseLine route={route} />
        {kmPoints(route).map((m) => (
          <Marker key={m.km} coordinate={toLatLng(m.at)} tracksViewChanges={false} accessible={false}>
            <View style={[styles.marker, { backgroundColor: colors.bg.elevated, borderColor: colors.route.casing }]}>
              <AppText role="caption" tabular style={[styles.markerText, { color: colors.route.casing }]}>
                {m.km}
              </AppText>
            </View>
          </Marker>
        ))}
        {isLoop ? null : <Dot at={route[route.length - 1]} size={14} fill={colors.route.casing} ring={colors.bg.elevated} />}
        <Dot at={route[0]} size={15} fill={colors.bg.elevated} ring={colors.route.casing} ringWidth={3.5} />
        <Pin at={route[0]} fill={colors.action.primary}>
          <PinText color={colors.action.onPrimary}>{isLoop ? '출발 · 도착' : '출발'}</PinText>
        </Pin>
      </BrandMap>
    </View>
  );
}

// 1km마다 표시. 왕복 코스처럼 같은 자리에 겹치는 표시(80m 안)는 먼저 놓인 것만 남긴다.
function kmPoints(route: GeoPoint[]) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += distanceM(route[i - 1], route[i]);
  const out: { km: number; at: GeoPoint }[] = [];
  for (let km = 1; km * 1000 < total - 150; km++) {
    const at = pointAt(route, (km * 1000) / total);
    if (out.every((m) => distanceM(m.at, at) > 80)) out.push({ km, at });
  }
  return out;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
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
});
