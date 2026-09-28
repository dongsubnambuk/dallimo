import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import { Marker, Polyline } from 'react-native-maps';

import { BrandMap, Dot, Pin, PinText, regionFor, toLatLng, useAnimateToRegion } from '@/components/AppleMap';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { MyDot } from './MyDot';
import type { ReadyMapProps } from './ReadyMap';

// iOS Run Ready 지도 (애플 지도, dark). 89장 dark pre-run canvas: 코스(민트) · 출발점 · 내 위치만 올린다.
// 러닝 준비 화면의 지도는 확인용이라 제스처를 끈다 (62.2장).
export function ReadyMap({ route, position, fallbackCenter, showWayToStart, locating, accessibilityLabel }: ReadyMapProps) {
  const { colors } = useTheme();
  const ref = useRef<MapView>(null);
  const sets = [...(route ? [route] : []), ...(position ? [[position]] : [])];
  const region = regionFor(sets.length ? sets : [[fallbackCenter]], route ? 500 : 700, 1.6);
  useAnimateToRegion(ref, region);

  return (
    <View style={[styles.root, { backgroundColor: colors.mapBase.land }]}>
      <BrandMap ref={ref} dark interactive={false} initialRegion={region ?? undefined} accessibilityLabel={accessibilityLabel}>
        {route ? (
          <>
            <Polyline coordinates={route.map(toLatLng)} strokeColor={colors.route.course + '38'} strokeWidth={20} lineCap="round" lineJoin="round" />
            <Polyline coordinates={route.map(toLatLng)} strokeColor={colors.route.course} strokeWidth={5} lineCap="round" lineJoin="round" />
          </>
        ) : null}
        {showWayToStart && route && position ? (
          <Polyline coordinates={[toLatLng(position), toLatLng(route[0])]} strokeColor={colors.text.primary} strokeWidth={2} lineDashPattern={[2, 6]} lineCap="round" />
        ) : null}
        {route ? (
          <>
            <Dot at={route[0]} size={16} fill={colors.action.primary} ring={colors.bg.canvas} />
            <Pin at={route[0]} fill={colors.action.primary}>
              <PinText color={colors.action.onPrimary}>출발</PinText>
            </Pin>
          </>
        ) : null}
        {position ? (
          // 링이 계속 퍼지므로 이 핀만 화면 변화를 따라 다시 그린다
          <Marker coordinate={toLatLng(position)} tracksViewChanges accessible={false}>
            <MyDot locating={locating} />
          </Marker>
        ) : null}
      </BrandMap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: radius.sheet,
    overflow: 'hidden',
  },
});
