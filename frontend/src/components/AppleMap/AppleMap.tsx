import { forwardRef, useEffect, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, type EdgePadding, type Region } from 'react-native-maps';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import type { GeoPoint } from '@/shared/geo';

// iOS 지도 (사용자 결정: iOS 우선 · 애플 지도, FOUNDATION-DECISION-LOG 26항).
// 애플 지도는 바탕 색을 바꿀 수 없어서 차분한 mutedStandard 위에 코스 · 경로 · 핀만 브랜드 색으로 그린다 (83장 route signal).
// 이 파일은 *.ios.tsx 지도 화면에서만 쓴다. 웹 · Android는 기존 SVG 지도를 그대로 쓴다.

export const toLatLng = (p: GeoPoint) => ({ latitude: p.latitude, longitude: p.longitude });

/** 가운데 둘레 spanM(m)을 보여주는 region */
export function regionAround(c: GeoPoint, spanM: number): Region {
  const latitudeDelta = spanM / 111_320;
  return { latitude: c.latitude, longitude: c.longitude, latitudeDelta, longitudeDelta: latitudeDelta / Math.cos((c.latitude * Math.PI) / 180) };
}

/** 여러 점 묶음을 모두 담는 region. 최소 범위 minSpanM(m)보다 더 확대하지 않는다. */
export function regionFor(sets: GeoPoint[][], minSpanM: number, padRatio = 1.35): Region | null {
  const pts = sets.flat();
  if (!pts.length) return null;
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const c = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const min = regionAround(c, minSpanM);
  return {
    ...c,
    latitudeDelta: Math.max(min.latitudeDelta, (Math.max(...lats) - Math.min(...lats)) * padRatio),
    longitudeDelta: Math.max(min.longitudeDelta, (Math.max(...lngs) - Math.min(...lngs)) * padRatio),
  };
}

/** region이 값으로 바뀔 때만 지도를 부드럽게 옮긴다. 위치 객체가 매번 새로 만들어져도 흔들리지 않는다. */
export function useAnimateToRegion(ref: RefObject<MapView | null>, region: Region | null, duration = 350) {
  const key = region ? [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta].map((v) => v.toFixed(6)).join(',') : '';
  useEffect(() => {
    if (!key) return;
    const [latitude, longitude, latitudeDelta, longitudeDelta] = key.split(',').map(Number);
    ref.current?.animateToRegion({ latitude, longitude, latitudeDelta, longitudeDelta }, duration);
  }, [key, ref, duration]);
}

type BrandMapProps = {
  // 러닝 컨텍스트(dark)면 어두운 지도
  dark?: boolean;
  initialRegion?: Region;
  region?: Region;
  // 러닝 중처럼 보기만 하는 지도는 제스처를 끈다 (62.2장 러닝 중 지도는 확인용)
  interactive?: boolean;
  // 장소(POI) 표시. 탐색처럼 주변을 보는 화면만 켠다
  pointsOfInterest?: boolean;
  // 겹친 UI가 가리는 영역. 애플 로고 · 법적 고지가 가려지지 않게 한다
  padding?: EdgePadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: ReactNode;
};

export const BrandMap = forwardRef<MapView, BrandMapProps>(function BrandMap(
  { dark = false, initialRegion, region, interactive = true, pointsOfInterest = false, padding, onPress, style, accessibilityLabel, children },
  ref,
) {
  return (
    <MapView
      ref={ref}
      style={style ?? StyleSheet.absoluteFill}
      mapType="mutedStandard"
      userInterfaceStyle={dark ? 'dark' : 'light'}
      initialRegion={initialRegion}
      region={region}
      showsPointsOfInterests={pointsOfInterest}
      showsBuildings={false}
      showsTraffic={false}
      showsCompass={false}
      showsScale={false}
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      toolbarEnabled={false}
      mapPadding={padding}
      onPress={onPress}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </MapView>
  );
});

// 코스 선: 번짐 + 짙은 민트 테두리 + 형광 민트 (SVG 지도와 같은 3겹)
export function CourseLine({ route, emphasis = 'normal' }: { route: GeoPoint[]; emphasis?: 'normal' | 'selected' | 'thin' }) {
  const { colors } = useTheme();
  const coords = route.map(toLatLng);
  const w = emphasis === 'selected' ? { glow: 20, casing: 9, core: 5.5 } : emphasis === 'thin' ? { glow: 0, casing: 5.5, core: 3 } : { glow: 20, casing: 9, core: 5.5 };
  return (
    <>
      {w.glow ? <Polyline coordinates={coords} strokeColor={colors.route.course + '47'} strokeWidth={w.glow} lineCap="round" lineJoin="round" /> : null}
      <Polyline coordinates={coords} strokeColor={colors.route.casing} strokeWidth={w.casing} lineCap="round" lineJoin="round" />
      <Polyline coordinates={coords} strokeColor={colors.route.course} strokeWidth={w.core} lineCap="round" lineJoin="round" />
    </>
  );
}

// 실제로 달린 길: 코스와 겹치면 가는 선, 혼자면 굵은 선 (색 · 굵기 둘 다로 구분, CLAUDE.md 8항)
export function PathLine({ path, overCourse }: { path: GeoPoint[]; overCourse: boolean }) {
  const { colors } = useTheme();
  if (path.length < 2) return null;
  return <Polyline coordinates={path.map(toLatLng)} strokeColor={colors.route.actual} strokeWidth={overCourse ? 3 : 5} lineCap="round" lineJoin="round" />;
}

// 점 표시 (출발 · 도착 · 내 위치). 지도 좌표에 원의 가운데를 맞춘다.
export function Dot({ at, size, fill, ring, ringWidth = 3 }: { at: GeoPoint; size: number; fill: string; ring: string; ringWidth?: number }) {
  return (
    <Marker coordinate={toLatLng(at)} tracksViewChanges={false} accessible={false}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderColor: ring, borderWidth: ringWidth }} />
    </Marker>
  );
}

// 점 위에 뜨는 말풍선 핀 ("출발", 러너 수). 꼬리 끝이 좌표에 오도록 위로 올린다.
const PIN_H = 24;
const TAIL = 5;
export function Pin({ at, fill, children, onPress }: { at: GeoPoint; fill?: string; children: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const bg = fill ?? colors.bg.elevated;
  return (
    <Marker coordinate={toLatLng(at)} centerOffset={{ x: 0, y: -(PIN_H + TAIL) / 2 - 8 }} tracksViewChanges={false} onPress={onPress}>
      <View style={styles.pinWrap}>
        <View style={[styles.pin, { backgroundColor: bg, boxShadow: elevation.mapOverlay }]}>{children}</View>
        <View style={[styles.tail, { borderTopColor: bg }]} />
      </View>
    </Marker>
  );
}

export function PinText({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <AppText role="caption" tabular style={[styles.pinText, color ? { color } : null]}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: 'center',
  },
  pin: {
    height: PIN_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: TAIL,
    borderRightWidth: TAIL,
    borderTopWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pinText: {
    fontFamily: fontFamily.extrabold,
  },
});
