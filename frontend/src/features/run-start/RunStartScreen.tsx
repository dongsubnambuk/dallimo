import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, motion, spacing } from '@/design/tokens';
import { PendingScreen } from '@/features/pending/PendingScreen';
import { MODE_TITLE, parseRunPlan, type RunPlanParams } from '@/features/run-ready/runPlanParams';
import { formatDuration } from '@/shared/format';
import { haptics } from '@/shared/haptics';

const COUNT_FROM = 3;
// "출발" 글자를 보여주는 시간
const GO_MS = 700;

// RUN-003 카운트다운. 69장 Run Start: 3-2-1 숫자 scale/fade, 각 숫자 약한 햅틱, 출발 강한 햅틱.
// 카운트다운이 끝나면 Active Run(72장 6번 단계)으로 이어진다. 그 전까지는 준비 중 화면으로 흐름만 확인한다.
export function RunStartScreen({ params }: { params: RunPlanParams }) {
  return (
    <ThemeProvider scheme="dark">
      <RunStart params={params} />
    </ThemeProvider>
  );
}

function RunStart({ params }: { params: RunPlanParams }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const plan = parseRunPlan(params);
  // COUNT_FROM..1 → 0(출발) → -1(러닝)
  const [count, setCount] = useState(COUNT_FROM);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (count < 0) return;
    if (count > 0) haptics.countdownTick();
    else haptics.runStart();
    if (!reduced) {
      scale.value = 1.35;
      opacity.value = 0;
      scale.value = withTiming(1, { duration: 320 });
      opacity.value = withTiming(1, { duration: 200 });
    }
    const timer = setTimeout(() => setCount((c) => c - 1), count > 0 ? motion.countdownStep : GO_MS);
    return () => clearTimeout(timer);
  }, [count, reduced, scale, opacity]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  const summary =
    plan.kind === 'free'
      ? MODE_TITLE.FREE
      : [
          params.courseName,
          MODE_TITLE[plan.plan.mode],
          plan.plan.targetSec != null ? `목표 ${formatDuration(plan.plan.targetSec)}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  if (count < 0) {
    return (
      <>
        <StatusBar style="light" />
        <PendingScreen title="달리는 중" order="Active Run 단계(72장 6~7번)" handoff={summary} action={{ label: '준비 화면으로', onPress: () => router.back() }} />
      </>
    );
  }

  const go = count === 0;
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />
      <View style={styles.center} accessible accessibilityLiveRegion="assertive" accessibilityLabel={go ? '출발' : String(count)}>
        <Animated.View style={numberStyle}>
          <AppText role="metricHero" tabular maxFontSizeMultiplier={1} style={[go ? styles.go : styles.number, { color: colors.action.primary }]}>
            {go ? '출발' : count}
          </AppText>
        </Animated.View>
        <AppText role="body" tone="secondary" numberOfLines={2} style={styles.summary}>
          {summary}
        </AppText>
      </View>
      {go ? (
        <View style={styles.cancel} />
      ) : (
        <SecondaryButton label="취소" onPress={() => router.back()} style={styles.cancel} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  number: {
    fontSize: 180,
    lineHeight: 190,
    fontFamily: fontFamily.black,
    letterSpacing: -6,
  },
  go: {
    fontSize: 96,
    lineHeight: 110,
    fontFamily: fontFamily.black,
    letterSpacing: -3,
  },
  summary: {
    textAlign: 'center',
  },
  cancel: {
    alignSelf: 'center',
    minWidth: 160,
    minHeight: 56,
  },
});
