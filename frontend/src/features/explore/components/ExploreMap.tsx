import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { CourseSummary } from '@/entities/course/types';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import { distanceM, makeProjection, pointToPolylinePx, type GeoPoint } from '@/shared/geo';

export type ExploreMapProps = {
  courses: CourseSummary[];
  selectedId: string | null;
  onSelectCourse: (id: string) => void;
  userPosition: GeoPoint | null;
  loading?: boolean;
  height: number;
  // 지도 위에 겹친 UI(상단 검색, 하단 시트)가 가리는 높이. 선택 코스를 가리지 않게 맞춘다 (8항 Maps).
  obscured: { top: number; bottom: number };
};

// 사용자 위치를 함께 보여줄 최대 거리. 더 멀면 선택 코스만 맞춘다.
const USER_IN_FRAME_M = 2500;
const TAP_TOLERANCE_PX = 24;
const SIDE_PAD = spacing.xxl;

// 지도 컴포넌트 경계 (CLAUDE-VISUAL-IMPLEMENTATION-PROMPT Phase 2).
// 지도 SDK가 정해지면 이 파일의 구현만 바꾸고 props는 유지한다.
// 지금은 SDK 없이 코스 경로 geometry를 직접 그리는 기능형 placeholder다. 정적 이미지로 지도를 흉내 내지 않는다.
// 90장: 리스트 선택과 지도 route highlight가 서로 연결된다. 경로를 눌러도 선택된다.
export function ExploreMap({ courses, selectedId, onSelectCourse, userPosition, loading = false, height, obscured }: ExploreMapProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const rootRef = useRef<View>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const selected = courses.find((c) => c.id === selectedId) ?? null;
  // 선택 코스(+가까우면 내 위치)에 맞춘다. 다른 코스는 같은 축척으로 주변에 흐리게 보인다.
  const frame: GeoPoint[][] = selected ? [selected.displayRoute] : courses.map((c) => c.displayRoute);
  if (userPosition && (!selected || distanceM(userPosition, selected.displayRoute[0]) < USER_IN_FRAME_M)) frame.push([userPosition]);
  const canDraw = width > 0 && frame.flat().length > 1;
  const project = canDraw
    ? makeProjection(frame, width, height, { top: obscured.top + spacing.xl, bottom: obscured.bottom + spacing.xl, left: SIDE_PAD, right: SIDE_PAD })
    : null;
  const screen = (pts: GeoPoint[]) => (project ? pts.map(project) : []);
  const toPoints = (pts: GeoPoint[]) => screen(pts).map((p) => p.join(',')).join(' ');
  const start = selected && project ? project(selected.displayRoute[0]) : null;
  const me = userPosition && project ? project(userPosition) : null;

  // 경로 탭 판정: SVG 요소에 터치 핸들러를 달지 않고 가장 가까운 경로를 계산한다 (web/native 동작 통일)
  // locationX는 web에서 눌린 SVG 자식 기준이라 쓰지 않고, 화면 좌표에서 지도 위치를 뺀다.
  const onPress = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    rootRef.current?.measureInWindow((x, y) => {
      if (!project) return;
      const p: [number, number] = [pageX - x, pageY - y];
      let best: { id: string; d: number } | null = null;
      for (const c of courses) {
        const d = pointToPolylinePx(p, screen(c.displayRoute));
        if (d < TAP_TOLERANCE_PX && (!best || d < best.d)) best = { id: c.id, d };
      }
      if (best) onSelectCourse(best.id);
    });
  };

  return (
    <View ref={rootRef} onLayout={onLayout} style={[styles.root, { height, backgroundColor: colors.border.subtle }]}>
      <Pressable onPress={onPress} accessible={false} style={StyleSheet.absoluteFill}>
        {project ? (
          <Svg width={width} height={height}>
            {courses
              .filter((c) => c.id !== selectedId)
              .map((c) => (
                <Polyline key={c.id} points={toPoints(c.displayRoute)} fill="none" stroke={colors.border.strong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            {selected ? (
              <>
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.course} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                {start ? <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.surface} stroke={colors.route.course} strokeWidth={3} /> : null}
              </>
            ) : null}
            {me ? (
              <>
                <Circle cx={me[0]} cy={me[1]} r={11} fill={colors.action.tint} />
                <Circle cx={me[0]} cy={me[1]} r={5} fill={colors.text.primary} stroke={colors.bg.surface} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
      {start ? (
        <View pointerEvents="none" style={[styles.tagAnchor, { left: start[0] - TAG_ANCHOR / 2, top: start[1] }]}>
          <View style={[styles.tag, { backgroundColor: colors.route.course, boxShadow: elevation.mapOverlay }]}>
            <AppText role="caption" style={[styles.tagText, { color: colors.action.onPrimary }]}>
              출발
            </AppText>
          </View>
        </View>
      ) : null}
      {loading ? (
        <View pointerEvents="none" style={styles.loading} accessibilityLabel="지도 불러오는 중">
          <ActivityIndicator color={colors.text.secondary} />
        </View>
      ) : null}
    </View>
  );
}

const TAG_ANCHOR = 120;
const TAG_HEIGHT = 22;

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAnchor: {
    position: 'absolute',
    width: TAG_ANCHOR,
    marginTop: -TAG_HEIGHT - 10,
    alignItems: 'center',
  },
  tag: {
    height: TAG_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  tagText: {
    fontFamily: fontFamily.semibold,
  },
});
