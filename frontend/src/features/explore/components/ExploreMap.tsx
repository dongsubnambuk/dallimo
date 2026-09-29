import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';

import { BrandLoader } from '@/components/Brand';
import { MapBaseLayer } from '@/components/MapBaseLayer';
import type { CourseSummary } from '@/entities/course/types';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing } from '@/design/tokens';
import { formatCount } from '@/shared/format';
import { makeProjection, pointToPolylinePx, type GeoPoint } from '@/shared/geo';

import type { MapBase } from '@/shared/map/mockMapBase';

import { frameFor, MIN_SPAN_M, MIN_SPAN_VERTICAL_M, withMinSpan } from './exploreFrame';

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
  // CRS-002 사용자가 지도를 옮기고 멈췄을 때 (중심, 보이는 반경 m). 움직이는 지도(iOS 애플 지도)만 알린다
  onUserMoved?: (center: GeoPoint, radiusM: number) => void;
};

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
  const frame = withMinSpan(frameFor(focus, selected, courses, userPosition, fallbackCenter), MIN_SPAN_M, MIN_SPAN_VERTICAL_M);
  const canDraw = width > 0 && frame.flat().length > 1;
  const project = canDraw
    ? makeProjection(frame, width, height, { top: obscured.top + BUBBLE_SPACE, bottom: obscured.bottom + spacing.xl, left: SIDE_PAD, right: SIDE_PAD })
    : null;
  const screen = (pts: GeoPoint[]) => (project ? pts.map(project) : []);
  const toPoints = (pts: GeoPoint[]) => screen(pts).map((p) => p.join(',')).join(' ');
  const start = selected && project ? project(selected.displayRoute[0]) : null;
  const me = userPosition && project ? project(userPosition) : null;
  // 상단 검색·하단 카드에 가려지거나 가장자리에서 잘리는 위치의 라벨·말풍선은 숨긴다
  const inView = ([x, y]: [number, number]) =>
    x > EDGE && x < width - EDGE && y > obscured.top + PIN_HEIGHT && y < height - obscured.bottom;

  // 핀·지명 겹침 정리: "출발" 핀 → 러너가 많은 코스 핀 → 지명 순으로 자리를 잡고, 이미 잡힌 자리와 겹치면 숨긴다.
  const placed: Rect[] = [];
  const take = (r: Rect) => {
    if (placed.some((q) => r.l < q.r && q.l < r.r && r.t < q.b && q.t < r.b)) return false;
    placed.push(r);
    return true;
  };
  const showStart = !!start && inView(start) && take(pinRect(start, START_PIN_W));
  const pins = project
    ? courses
        .filter((c) => c.id !== selectedId)
        .map((c) => ({ c, p: project(c.displayRoute[0]) }))
        .filter(({ p }) => inView(p))
        .sort((a, z) => z.c.weeklyRunnerCount - a.c.weeklyRunnerCount)
        .filter(({ c, p }) => take(pinRect(p, RUNNER_PIN_BASE_W + formatCount(c.weeklyRunnerCount).length * DIGIT_W)))
    : [];
  const labels =
    project && base
      ? base.labels
          .map((l) => ({ l, p: project(l.at) }))
          .filter(({ p }) => inView(p))
          .filter(({ l, p: [x, y] }) => take({ l: x - (l.text.length * LABEL_CHAR_W) / 2, r: x + (l.text.length * LABEL_CHAR_W) / 2, t: y - spacing.sm, b: y + spacing.sm }))
      : [];

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
    <View ref={rootRef} onLayout={onLayout} style={[styles.root, { height, backgroundColor: colors.mapBase.land }]}>
      <Pressable onPress={onPress} accessible={false} style={StyleSheet.absoluteFill}>
        {project ? (
          <Svg width={width} height={height}>
            {base ? <MapBaseLayer base={base} project={project} /> : null}
            {/* 모든 코스를 형광 민트 선으로: 무채색 지도 위에서 '달릴 수 있는 길'이 먼저 보인다 (83장 route signal) */}
            {courses
              .filter((c) => c.id !== selectedId)
              .map((c) => (
                <G key={c.id}>
                  <Polyline points={toPoints(c.displayRoute)} fill="none" stroke={colors.route.casing} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.9} />
                  <Polyline points={toPoints(c.displayRoute)} fill="none" stroke={colors.route.course} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </G>
              ))}
            {selected ? (
              <>
                {/* 선택 코스: 넓은 민트 번짐 + 짙은 민트 테두리 + 굵은 형광 민트 */}
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.course} strokeOpacity={0.28} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.casing} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={toPoints(selected.displayRoute)} fill="none" stroke={colors.route.course} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
                {start ? <Circle cx={start[0]} cy={start[1]} r={7} fill={colors.bg.elevated} stroke={colors.route.casing} strokeWidth={3.5} /> : null}
              </>
            ) : null}
            {me ? (
              <>
                <Circle cx={me[0]} cy={me[1]} r={18} fill={colors.route.casing} fillOpacity={0.14} />
                <Circle cx={me[0]} cy={me[1]} r={7.5} fill={colors.route.casing} stroke={colors.bg.elevated} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </Pressable>

      {labels.map(({ l, p: [x, y] }) => (
        <View key={l.text} pointerEvents="none" style={[styles.labelAnchor, { left: x - LABEL_ANCHOR / 2, top: y - spacing.sm }]}>
          <AppText role="caption" tone="secondary" style={styles.placeLabel}>
            {l.text}
          </AppText>
        </View>
      ))}

      {pins.map(({ c, p: [x, y] }) => (
        <Bubble key={c.id} x={x} y={y}>
          <AppIcon name="running" size={12} color={colors.text.secondary} />
          <AppText role="caption" tabular style={styles.bubbleText}>
            {formatCount(c.weeklyRunnerCount)}
          </AppText>
        </Bubble>
      ))}

      {start && showStart ? (
        <Bubble x={start[0]} y={start[1]} fill={colors.action.primary}>
          <AppText role="caption" style={[styles.bubbleText, { color: colors.action.onPrimary }]}>
            출발
          </AppText>
        </Bubble>
      ) : null}

      {base ? (
        <AppText role="caption" tone="secondary" style={[styles.attribution, { bottom: obscured.bottom + spacing.xs }]} accessibilityElementsHidden>
          {base.attribution}
        </AppText>
      ) : null}

      {loading ? (
        <View pointerEvents="none" style={styles.loading}>
          <BrandLoader size={44} label="지도 불러오는 중" />
        </View>
      ) : null}
    </View>
  );
}

// 경로 시작점 위의 작은 말풍선 (레퍼런스 P3, 쏘카·카카오T 지도 위 검정 가격 핀)
function Bubble({ x, y, fill, children }: { x: number; y: number; fill?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const bg = fill ?? colors.bg.elevated;
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
// 핀이 기준점 위로 차지하는 높이 (말풍선 + 꼬리 + 간격)
const PIN_HEIGHT = BUBBLE_HEIGHT + TAIL + 8;
// 경로 맨 위 점 위에 말풍선이 들어갈 자리
const BUBBLE_SPACE = BUBBLE_HEIGHT + TAIL + spacing.lg;
// 겹침 판정용 대략 크기 (px)
const START_PIN_W = 48;
const RUNNER_PIN_BASE_W = 34;
const DIGIT_W = 8;
const LABEL_CHAR_W = 12;

type Rect = { l: number; r: number; t: number; b: number };

// 점 위에 꼬리를 두고 떠 있는 핀이 차지하는 영역
function pinRect([x, y]: [number, number], w: number): Rect {
  return { l: x - w / 2, r: x + w / 2, t: y - PIN_HEIGHT, b: y };
}
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
    fontFamily: fontFamily.bold,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowRadius: 3,
  },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    fontSize: 9,
    lineHeight: 12,
    opacity: 0.8,
  },
  bubbleAnchor: {
    position: 'absolute',
    width: BUBBLE_ANCHOR,
    marginTop: -PIN_HEIGHT,
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
