import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';

import type { CourseSummary } from '@/entities/course/types';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import { formatCount } from '@/shared/format';
import { distanceM, makeProjection, pointToPolylinePx, type GeoPoint } from '@/shared/geo';

import type { MapBase } from '../api/mockMapBase';

export type ExploreMapProps = {
  courses: CourseSummary[];
  selectedId: string | null;
  onSelectCourse: (id: string) => void;
  userPosition: GeoPoint | null;
  // 코스가 없을 때(로딩·결과 없음·오류) 보여줄 중심
  fallbackCenter: GeoPoint;
  // 'selection': 선택 코스에 맞춤, 'user': 내 위치 중심
  focus: 'selection' | 'user';
  // 지도 SDK 전 placeholder 바탕. SDK 도입 시 제거.
  base?: MapBase;
  loading?: boolean;
  height: number;
  // 지도 위에 겹친 UI(상단 검색, 하단 카드·시트)가 가리는 높이. 선택 코스를 가리지 않게 맞춘다 (8항 Maps).
  obscured: { top: number; bottom: number };
};

const USER_IN_FRAME_M = 2500;
const USER_FOCUS_RADIUS_M = 900;
const TAP_TOLERANCE_PX = 24;
const SIDE_PAD = spacing.xxl;

// 지도 컴포넌트 경계 (CLAUDE-VISUAL-IMPLEMENTATION-PROMPT Phase 2). SDK가 정해지면 이 파일의 구현만 바꾸고 props는 유지한다.
// 레퍼런스 P1: 코스는 지도 위 경로 선 + 출발 표시. 고스트러너: 코스 위에 달린 사람 수를 보여 사회적 신호를 준다.
// 90장: 리스트 선택과 지도 route highlight가 서로 연결된다. 경로를 눌러도 선택된다.
export function ExploreMap({
  courses,
  selectedId,
  onSelectCourse,
  userPosition,
  fallbackCenter,
  focus,
  base,
  loading = false,
  height,
  obscured,
}: ExploreMapProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const rootRef = useRef<View>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const selected = courses.find((c) => c.id === selectedId) ?? null;
  const frame = frameFor(focus, selected, courses, userPosition, fallbackCenter);
  const canDraw = width > 0 && frame.flat().length > 1;
  const project = canDraw
    ? makeProjection(frame, width, height, { top: obscured.top + BUBBLE_SPACE, bottom: obscured.bottom + spacing.xl, left: SIDE_PAD, right: SIDE_PAD })
    : null;
  const screen = (pts: GeoPoint[]) => (project ? pts.map(project) : []);
  const toPoints = (pts: GeoPoint[]) => screen(pts).map((p) => p.join(',')).join(' ');
  const start = selected && project ? project(selected.displayRoute[0]) : null;
  const me = userPosition && project ? project(userPosition) : null;
  const b = colors.mapBase;
  // 상단 검색·하단 카드에 가려지거나 가장자리에서 잘리는 위치의 라벨·말풍선은 숨긴다
  const inView = ([x, y]: [number, number]) =>
    x > EDGE && x < width - EDGE && y > obscured.top + BUBBLE_HEIGHT && y < height - obscured.bottom;

  // 경로 탭 판정: locationX는 web에서 눌린 SVG 자식 기준이라 쓰지 않고, 화면 좌표에서 지도 위치를 뺀다.
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
    <View ref={rootRef} onLayout={onLayout} style={[styles.root, { height, backgroundColor: b.land }]}>
      <Pressable onPress={onPress} accessible={false} style={StyleSheet.absoluteFill}>
        {project ? (
          <Svg width={width} height={height}>
            {base ? (
              <>
                {base.minorRoads.map((r, i) => (
                  <Polyline key={`mr${i}`} points={toPoints(r)} fill="none" stroke={b.road} strokeWidth={2} />
                ))}
                {base.parks.map((p, i) => (
                  <Polygon key={`pk${i}`} points={toPoints(p)} fill={b.park} />
                ))}
                {base.water.map((w, i) => (
                  <Polygon key={`wt${i}`} points={toPoints(w)} fill={b.water} />
                ))}
                {base.rivers.map((r, i) => (
                  <Polyline key={`rv${i}`} points={toPoints(r)} fill="none" stroke={b.water} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {base.majorRoads.map((r, i) => (
                  <Polyline key={`MR${i}`} points={toPoints(r)} fill="none" stroke={b.roadMajor} strokeWidth={7} />
                ))}
              </>
            ) : null}
            {courses
              .filter((c) => c.id !== selectedId)
              .map((c) => (
                <Polyline key={c.id} points={toPoints(c.displayRoute)} fill="none" stroke={colors.text.primary} strokeOpacity={0.32} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            {selected ? (
              <>
                {/* 선택 코스: 검정 테두리 위 민트 선 (83장 route signal, 레퍼런스: 스트라바·NRC 경로 강조) */}
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.casing} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.course} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                {start ? <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.elevated} stroke={colors.route.casing} strokeWidth={3} /> : null}
              </>
            ) : null}
            {me ? (
              <>
                <Circle cx={me[0]} cy={me[1]} r={16} fill={colors.action.primary} fillOpacity={0.28} />
                <Circle cx={me[0]} cy={me[1]} r={7} fill={colors.text.primary} stroke={colors.bg.elevated} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </Pressable>

      {project && base
        ? base.labels
            .map((l) => ({ l, p: project(l.at) }))
            .filter(({ p }) => inView(p))
            .map(({ l, p: [x, y] }) => {
              return (
              <View key={l.text} pointerEvents="none" style={[styles.labelAnchor, { left: x - LABEL_ANCHOR / 2, top: y - spacing.sm }]}>
                <AppText role="caption" tone="secondary" style={styles.placeLabel}>
                  {l.text}
                </AppText>
              </View>
            );
          })
        : null}

      {project
        ? courses
            .filter((c) => c.id !== selectedId)
            .map((c) => ({ c, p: project(c.displayRoute[0]) }))
            // 선택 코스의 "출발" 핀과 겹치면 러너 수 핀을 숨긴다
            .filter(({ p }) => inView(p) && !(start && Math.abs(p[0] - start[0]) < BUBBLE_GAP_X && Math.abs(p[1] - start[1]) < BUBBLE_GAP_Y))
            .map(({ c, p: [x, y] }) => {
              return (
                <Bubble key={c.id} x={x} y={y}>
                  <AppIcon name="running" size={12} color={colors.action.primary} />
                  <AppText role="caption" tabular style={[styles.bubbleText, { color: colors.action.onSecondary }]}>
                    {formatCount(c.weeklyRunnerCount)}
                  </AppText>
                </Bubble>
              );
            })
        : null}

      {start && selected && inView(start) ? (
        <Bubble x={start[0]} y={start[1]} fill={colors.action.primary}>
          <AppText role="caption" style={[styles.bubbleText, { color: colors.action.onPrimary }]}>
            출발
          </AppText>
        </Bubble>
      ) : null}

      {loading ? (
        <View pointerEvents="none" style={styles.loading} accessibilityLabel="지도 불러오는 중">
          <ActivityIndicator color={colors.text.secondary} />
        </View>
      ) : null}
    </View>
  );
}

function around(c: GeoPoint): GeoPoint[][] {
  const d = USER_FOCUS_RADIUS_M / 111_320;
  return [[{ latitude: c.latitude - d, longitude: c.longitude - d }, { latitude: c.latitude + d, longitude: c.longitude + d }]];
}

function frameFor(
  focus: ExploreMapProps['focus'],
  selected: CourseSummary | null,
  courses: CourseSummary[],
  user: GeoPoint | null,
  fallback: GeoPoint,
): GeoPoint[][] {
  if (focus === 'user' && user) return around(user);
  if (courses.length === 0) return around(user ?? fallback);
  const frame: GeoPoint[][] = selected ? [selected.displayRoute] : courses.map((c) => c.displayRoute);
  if (user && (!selected || distanceM(user, selected.displayRoute[0]) < USER_IN_FRAME_M)) frame.push([user]);
  return frame;
}

// 경로 시작점 위의 작은 말풍선 (레퍼런스 P3, 쏘카·카카오T 지도 위 검정 가격 핀)
function Bubble({ x, y, fill, children }: { x: number; y: number; fill?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const bg = fill ?? colors.action.secondary;
  return (
    <View pointerEvents="none" style={[styles.bubbleAnchor, { left: x - BUBBLE_ANCHOR / 2, top: y }]}>
      <View style={[styles.bubble, { backgroundColor: bg, boxShadow: elevation.mapOverlay }]}>{children}</View>
      <View style={[styles.bubbleTail, { borderTopColor: bg }]} />
    </View>
  );
}

const BUBBLE_ANCHOR = 120;
const EDGE = spacing.xxl;
const BUBBLE_HEIGHT = 24;
const TAIL = 5;
// 경로 맨 위 점 위에 말풍선이 들어갈 자리
const BUBBLE_SPACE = BUBBLE_HEIGHT + TAIL + spacing.lg;
// 두 핀이 겹친다고 보는 거리
const BUBBLE_GAP_X = 64;
const BUBBLE_GAP_Y = BUBBLE_HEIGHT + TAIL + spacing.xs;
const LABEL_ANCHOR = 100;

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelAnchor: {
    position: 'absolute',
    width: LABEL_ANCHOR,
    alignItems: 'center',
  },
  placeLabel: {
    fontFamily: fontFamily.medium,
  },
  bubbleAnchor: {
    position: 'absolute',
    width: BUBBLE_ANCHOR,
    marginTop: -BUBBLE_HEIGHT - TAIL - 8,
    alignItems: 'center',
  },
  bubble: {
    height: BUBBLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: TAIL,
    borderRightWidth: TAIL,
    borderTopWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleText: {
    fontFamily: fontFamily.extrabold,
  },
});
