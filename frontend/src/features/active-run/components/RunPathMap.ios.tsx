import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import { Polyline } from 'react-native-maps';

import { BrandMap, Dot, PathLine, regionAround, regionFor, toLatLng, useAnimateToRegion } from '@/components/AppleMap';
import { useTheme } from '@/design/theme';
import type { GeoPoint } from '@/shared/geo';

// iOS 러닝 중 지도 (애플 지도, dark). 62.2장: 러닝 중 지도는 상세 탐색용이 아니라 경로 확인/이탈 판단용.
// 코스 러닝이면 기준 코스(두꺼운 민트 + 번짐) 위에 지나온 길(가는 흰 선)과 내 위치. 자유 달리기는 내 위치를 따라간다.
// 조작을 줄이려고 제스처를 끈다 (CLAUDE.md 6항).
const FOLLOW_SPAN_M = 600;

export function RunPathMap({ path, position, course = null }: { path: GeoPoint[]; position: GeoPoint | null; course?: GeoPoint[] | null }) {
  const { colors } = useTheme();
  const ref = useRef<MapView>(null);
  const pts = position ? [...path, position] : path;
  const hasCourse = !!course && course.length > 1;
  const region = hasCourse ? regionFor([course!, ...(position ? [[position]] : [])], 500, 1.25) : position ? regionAround(position, FOLLOW_SPAN_M) : null;
  useAnimateToRegion(ref, region, 500);

  return (
    <View style={[styles.root, { backgroundColor: colors.mapBase.land }]}>
      <BrandMap
        ref={ref}
        dark
        interactive={false}
        initialRegion={region ?? undefined}
        accessibilityLabel={hasCourse ? '기준 코스와 지나온 경로, 내 위치 지도' : '지나온 경로와 내 위치 지도'}
      >
        {hasCourse ? (
          <>
            <Polyline coordinates={course!.map(toLatLng)} strokeColor={colors.route.course + '38'} strokeWidth={20} lineCap="round" lineJoin="round" />
            <Polyline coordinates={course!.map(toLatLng)} strokeColor={colors.route.course} strokeWidth={7} lineCap="round" lineJoin="round" />
            <Dot at={course![course!.length - 1]} size={14} fill={colors.route.course} ring={colors.bg.canvas} />
          </>
        ) : null}
        <PathLine path={pts} overCourse={hasCourse} />
        {path.length ? <Dot at={path[0]} size={12} fill={colors.bg.canvas} ring={colors.route.actual} /> : null}
        {/* 코스 러닝에서는 민트 코스 선 위에서도 보이도록 내 위치를 흰 점으로 */}
        {position ? <Dot at={position} size={18} fill={hasCourse ? colors.route.actual : colors.action.primary} ring={colors.bg.canvas} /> : null}
      </BrandMap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
