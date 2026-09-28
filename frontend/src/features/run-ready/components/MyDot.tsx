import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/design/theme';

export const DOT = 16;
// 퍼지는 링(최대 3.4배)이 잘리지 않는 크기. 지도 핀으로 쓸 때도 가운데가 좌표에 온다.
const BOX = DOT * 4;
const PULSE_MS = 1800;

// 내 위치: 흰 점 + 퍼지는 링. GPS를 찾는 중이면 점을 흐리게 한다. 동작 줄이기 설정이면 링을 멈춘다.
export function MyDot({ x, y, locating }: { x?: number; y?: number; locating: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!reduced) t.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1);
  }, [reduced, t]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1.8 : 1 + t.value * 2.4 }],
    opacity: reduced ? 0.25 : 0.45 * (1 - t.value),
  }));

  return (
    <View pointerEvents="none" style={[styles.dotAnchor, x != null && y != null ? { position: 'absolute', left: x - BOX / 2, top: y - BOX / 2 } : null]}>
      <Animated.View style={[styles.ring, { backgroundColor: colors.action.primary }, ring]} />
      <View style={[styles.dot, { backgroundColor: colors.route.actual, borderColor: colors.bg.canvas, opacity: locating ? 0.5 : 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dotAnchor: {
    width: BOX,
    height: BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
  },
});
