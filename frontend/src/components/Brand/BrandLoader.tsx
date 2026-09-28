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

  const { loop, dot } = MO;
  const animatedProps = useAnimatedProps(() => {
    const [x, y] = pointOnLoop(
      t.value,
      loop.x,
      loop.y,
      loop.width,
      loop.height,
      dot.x,
    );
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

// 루프(사각형 중심선) 둘레를 출발점부터 시계 방향으로 진행 비율 p만큼 간 지점
function pointOnLoop(
  p: number,
  x: number,
  y: number,
  w: number,
  h: number,
  startX: number,
): [number, number] {
  "worklet";
  const per = 2 * (w + h);
  let d = (((startX - x + p * per) % per) + per) % per;
  if (d < w) return [x + d, y];
  d -= w;
  if (d < h) return [x + w, y + d];
  d -= h;
  if (d < w) return [x + w - d, y + h];
  d -= w;
  return [x, y + h - d];
}
