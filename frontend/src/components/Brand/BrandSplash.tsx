import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { darkTheme } from "@/design/theme";
import { motion } from "@/design/tokens";

import { pointOnTrack } from "./BrandLoader";
import { MoGlyph } from "./BrandSymbol";
import { MO } from "./brandGeometry";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 네이티브 스플래시(app.json expo-splash-screen)와 같은 크기 · 자리 · 색. 바꾸면 둘 다 바꾼다.
export const SPLASH_SYMBOL_SIZE = 120;

type Props = {
  // 화면에 그려졌다: 이때 네이티브 스플래시를 내리면 끊김 없이 이어진다
  onShown: () => void;
  // 애니메이션이 끝나 사라졌다
  onDone: () => void;
};

// 앱 시작 스플래시. 네이티브 스플래시의 심볼을 그대로 이어받아 출발점이 "모" 루프를 한 바퀴 돈 뒤 사라진다.
// 동작 줄이기 설정이면 돌지 않고 바로 사라진다 (ACCESSIBILITY 10항).
export function BrandSplash({ onShown, onDone }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const lap = useSharedValue(0);
  const opacity = useSharedValue(1);
  const colors = darkTheme.colors;

  useEffect(() => {
    if (!shown) return;
    const lapMs = reduced ? 0 : motion.splashLap;
    if (!reduced)
      lap.value = withTiming(1, {
        duration: lapMs,
        easing: Easing.inOut(Easing.cubic),
      });
    opacity.value = withDelay(
      lapMs,
      withTiming(0, { duration: motion.splashFade }),
    );
    const timer = setTimeout(onDone, lapMs + motion.splashFade);
    return () => clearTimeout(timer);
    // 한 번만 재생한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const dotProps = useAnimatedProps(() => {
    const [cx, cy] = pointOnTrack(lap.value);
    return { cx, cy };
  });
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const b = MO.bounds;
  const side = Math.max(b.width, b.height);
  return (
    <Animated.View
      pointerEvents={shown ? "none" : "auto"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => {
        if (shown) return;
        setShown(true);
        onShown();
      }}
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: colors.bg.canvas },
        fade,
      ]}
    >
      <View>
        <Svg
          width={SPLASH_SYMBOL_SIZE}
          height={SPLASH_SYMBOL_SIZE}
          viewBox={`${b.x - (side - b.width) / 2} ${b.y - (side - b.height) / 2} ${side} ${side}`}
        >
          <MoGlyph
            glyph={colors.action.primary}
            dotFill={colors.text.primary}
            dotRing={colors.route.casing}
            hideDot
          />
          <AnimatedCircle
            animatedProps={dotProps}
            cx={MO.dot.x}
            cy={MO.dot.y}
            r={MO.dot.r}
            fill={colors.text.primary}
            stroke={colors.bg.canvas}
            strokeWidth={MO.dot.ring}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
