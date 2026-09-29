import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';

import { BrandMap, CourseLine, Dot, Pin, PinText, regionFor, useAnimateToRegion } from '@/components/AppleMap';
import { BrandLoader } from '@/components/Brand';
import { AppIcon } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { formatCount } from '@/shared/format';

import type { ExploreMapProps } from './ExploreMap';
import { frameFor, MIN_SPAN_M } from './exploreFrame';

// iOS 탐색 지도 (애플 지도). SVG 지도(ExploreMap.tsx)와 같은 props · 같은 범위 기준.
// 장소 이름은 애플 지도가 보여주므로 mock 지명(base.labels)은 쓰지 않는다.
// 90장: 리스트 선택과 지도 route highlight가 서로 연결된다. 경로나 러너 수 핀을 눌러도 선택된다.
export function ExploreMap({ courses, selectedId, onSelectCourse, userPosition, fallbackCenter, focus, loading = false, height, obscured, onUserMoved }: ExploreMapProps) {
  const { colors } = useTheme();
  const ref = useRef<MapView>(null);
  const selected = courses.find((c) => c.id === selectedId) ?? null;
  const region = regionFor(frameFor(focus, selected, courses, userPosition, fallbackCenter), MIN_SPAN_M);
  // 선택 · 초점이 바뀌면 부드럽게 옮긴다. 사용자가 움직인 지도는 다음 선택 전까지 그대로 둔다.
  useAnimateToRegion(ref, region);

  return (
    <View style={[styles.root, { height, backgroundColor: colors.mapBase.land }]}>
      <BrandMap
        ref={ref}
        initialRegion={region ?? undefined}
        pointsOfInterest
        padding={{ top: obscured.top, bottom: obscured.bottom, left: 0, right: 0 }}
        // CRS-002: 손으로 옮긴 지도만 알린다 (선택으로 옮긴 지도는 제외). 반경은 보이는 가로 폭의 절반
        onRegionChangeComplete={(r, isGesture) => {
          if (!isGesture || !onUserMoved) return;
          const halfWidthM = (r.longitudeDelta * 111_320 * Math.cos((r.latitude * Math.PI) / 180)) / 2;
          onUserMoved({ latitude: r.latitude, longitude: r.longitude }, Math.round(Math.min(20_000, Math.max(500, halfWidthM))));
        }}
        accessibilityLabel="주변 코스 지도"
      >
        {courses
          .filter((c) => c.id !== selectedId)
          .map((c) => (
            <CourseLine key={c.id} route={c.displayRoute} emphasis="thin" />
          ))}
        {selected ? <CourseLine route={selected.displayRoute} emphasis="selected" /> : null}
        {courses
          .filter((c) => c.id !== selectedId)
          .map((c) => (
            <Pin key={`pin-${c.id}`} at={c.displayRoute[0]} onPress={() => onSelectCourse(c.id)}>
              <AppIcon name="running" size={12} color={colors.text.secondary} />
              <PinText>{formatCount(c.weeklyRunnerCount)}</PinText>
            </Pin>
          ))}
        {selected ? (
          <>
            <Dot at={selected.displayRoute[0]} size={15} fill={colors.bg.elevated} ring={colors.route.casing} ringWidth={3.5} />
            <Pin at={selected.displayRoute[0]} fill={colors.action.primary}>
              <PinText color={colors.action.onPrimary}>출발</PinText>
            </Pin>
          </>
        ) : null}
        {userPosition ? <Dot at={userPosition} size={15} fill={colors.route.casing} ring={colors.bg.elevated} /> : null}
      </BrandMap>
      {/* 경로를 눌러 고르는 것은 러너 수 핀으로 대신한다 (애플 지도 선은 누르기 판정이 좁다) */}
      {loading ? (
        <View pointerEvents="none" style={styles.loading}>
          <BrandLoader size={44} label="지도 불러오는 중" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
