import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { darkTheme, useTheme } from "@/design/theme";

import { MoGlyph } from "./BrandSymbol";
import { MO } from "./brandGeometry";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const LAP_MS = 1600;

// 로딩 표시: 심볼 "모"의 루프를 출발점이 한 바퀴씩 도는 모양 (코스를 달리는 중).
// 동작 줄이기 설정이면 멈춘 심볼만 보여준다 (ACCESSIBILITY 10항).
export function BrandLoader({
  size = 40,
  label = "불러오는 중",
}: {
  size?: number;
  label?: string;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const glyph = scheme === "dark" ? colors.action.primary : colors.text.primary;

  useEffect(() => {
    if (!reduced)
      t.value = withRepeat(
        withTiming(1, { duration: LAP_MS, easing: Easing.linear }),
        -1,
      );
  }, [reduced, t]);

  const { dot } = MO;
  const animatedProps = useAnimatedProps(() => {
    const [x, y] = pointOnTrack(t.value);
    return { cx: x, cy: y };
  });

  const b = MO.bounds;
  const side = Math.max(b.width, b.height);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <Svg
        width={size}
        height={size}
        viewBox={`${b.x - (side - b.width) / 2} ${b.y - (side - b.height) / 2} ${side} ${side}`}
      >
        <MoGlyph
          glyph={glyph}
          dotFill={colors.action.primary}
          dotRing={glyph}
          hideDot
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={
            scheme === "dark"
              ? darkTheme.colors.text.primary
              : colors.action.primary
          }
          stroke={scheme === "dark" ? colors.route.casing : glyph}
          strokeWidth={dot.ring}
        />
      </Svg>
    </View>
  );
}

// 루프 획 가운데(둥근 사각형) 둘레를 출발점부터 시계 방향으로 진행 비율 p만큼 간 지점.
// 스플래시 애니메이션도 같은 길을 쓴다.
export function pointOnTrack(p: number): [number, number] {
  "worklet";
  const { x, y, width: w, height: h, radius: r } = MO.track;
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  const per = 2 * (sw + sh) + 4 * arc;
  // 위 변 위의 출발점에서 시작
  let d = ((((MO.dot.x - (x + r)) + p * per) % per) + per) % per;
  if (d < sw) return [x + r + d, y];
  d -= sw;
  if (d < arc) {
    const a = -Math.PI / 2 + d / r;
    return [x + w - r + r * Math.cos(a), y + r + r * Math.sin(a)];
  }
  d -= arc;
  if (d < sh) return [x + w, y + r + d];
  d -= sh;
  if (d < arc) {
    const a = d / r;
    return [x + w - r + r * Math.cos(a), y + h - r + r * Math.sin(a)];
  }
  d -= arc;
  if (d < sw) return [x + w - r - d, y + h];
  d -= sw;
  if (d < arc) {
    const a = Math.PI / 2 + d / r;
    return [x + r + r * Math.cos(a), y + h - r + r * Math.sin(a)];
  }
  d -= arc;
  if (d < sh) return [x, y + h - r - d];
  d -= sh;
  const a = Math.PI + d / r;
  return [x + r + r * Math.cos(a), y + r + r * Math.sin(a)];
}
