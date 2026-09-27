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
    ? makeProjection(frame, width, height, { top: obscured.top + spacing.xl, bottom: obscured.bottom + spacing.xl, left: SIDE_PAD, right: SIDE_PAD })
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
                <Polyline key={c.id} points={toPoints(c.displayRoute)} fill="none" stroke={colors.text.secondary} strokeOpacity={0.55} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            {selected ? (
              <>
                {/* 선택 코스: 흰 테두리 위 signal 선으로 지도 위에서 먼저 보이게 (83장 route signal) */}
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.bg.surface} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.course} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                {start ? <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.surface} stroke={colors.route.course} strokeWidth={3} /> : null}
              </>
            ) : null}
            {me ? (
              <>
                <Circle cx={me[0]} cy={me[1]} r={14} fill={colors.action.tint} />
                <Circle cx={me[0]} cy={me[1]} r={6} fill={colors.text.primary} stroke={colors.bg.surface} strokeWidth={2.5} />
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
            .filter(({ p }) => inView(p))
            .map(({ c, p: [x, y] }) => {
              return (
                <Bubble key={c.id} x={x} y={y}>
                  <AppIcon name="running" size={12} color={colors.text.secondary} />
                  <AppText role="caption" tabular style={styles.bubbleText}>
                    {formatCount(c.weeklyRunnerCount)}
                  </AppText>
                </Bubble>
              );
            })
        : null}

      {start && selected ? (
        <Bubble x={start[0]} y={start[1]} fill={colors.route.course}>
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

// 경로 시작점 위의 작은 말풍선 (레퍼런스 P3)
function Bubble({ x, y, fill, children }: { x: number; y: number; fill?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={[styles.bubbleAnchor, { left: x - BUBBLE_ANCHOR / 2, top: y }]}>
      <View style={[styles.bubble, { backgroundColor: fill ?? colors.bg.elevated, boxShadow: elevation.mapOverlay }]}>{children}</View>
    </View>
  );
}

const BUBBLE_ANCHOR = 120;
const EDGE = spacing.xxl;
const BUBBLE_HEIGHT = 22;
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
    marginTop: -BUBBLE_HEIGHT - 10,
    alignItems: 'center',
  },
  bubble: {
    height: BUBBLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  bubbleText: {
    fontFamily: fontFamily.semibold,
  },
});
