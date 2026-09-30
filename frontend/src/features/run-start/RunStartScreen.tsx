import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, motion, spacing } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import { flattenBlocks } from '@/entities/workout/flatten';
import { ActiveRunScreen } from '@/features/active-run/ActiveRunScreen';
import { beginActiveRun, endActiveRun, type ActiveRunOptions } from '@/features/run/engine/activeRunSession';
import { MODE_TITLE, parseRunPlan, type RunPlanParams } from '@/features/run-ready/runPlanParams';
import { launchWatchApp, sendWatchIdle, useWatchCountdown } from '@/features/watch/useWatchLink';
import { formatDuration } from '@/shared/format';
import { haptics } from '@/shared/haptics';

const COUNT_FROM = 3;
// "출발" 글자를 보여주는 시간
const GO_MS = 700;

// RUN-003 카운트다운. 69장 Run Start: 3-2-1 숫자 scale/fade, 각 숫자 약한 햅틱, 출발 강한 햅틱.
// 카운트다운 동안 엔진을 준비(prepare)하고 "출발"에서 기록을 시작(start)한 뒤 Active Run으로 이어진다.
// 앱이 꺼졌다 켜져 이어서 기록하는 경우(recovering)는 카운트다운 없이 바로 Active Run으로 간다.
type Props = { params: RunPlanParams; options: ActiveRunOptions; recovering: boolean };

export function RunStartScreen(props: Props) {
  return (
    <ThemeProvider scheme="dark">
      <RunStart {...props} />
    </ThemeProvider>
  );
}

function RunStart({ params, options, recovering }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const plan = parseRunPlan(params);
  // COUNT_FROM..1 → 0(출발) → -1(러닝)
  const [count, setCount] = useState(recovering ? -1 : COUNT_FROM);
  const [engine] = useState(() => beginActiveRun(options));
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // 코스 러닝이면 기준 코스 경로를 받아 엔진에 넘긴다 (CRUN-001). 코스 상세·러닝 준비에서 이미 받은 값을 다시 쓴다.
  const courseId = plan.kind === 'course' ? plan.plan.courseId : null;
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const courseQuery = useQuery({
    queryKey: ['course', 'detail', courseId, 'normal'],
    queryFn: () => repo.getDetail(courseId as string),
    enabled: courseId != null,
    retry: false,
  });
  const courseReady = courseId == null || !courseQuery.isPending;

  useEffect(() => {
    if (!courseReady) return;
    const detail = courseQuery.data;
    const input = {
      mode: plan.kind === 'free' ? ('FREE' as const) : plan.kind === 'interval' ? ('INTERVAL' as const) : plan.plan.mode,
      // 코스를 받지 못하면 코스 없이 기록만 한다 (진행률·이탈 안내 없음)
      ...(detail ? { course: { id: detail.id, route: detail.route } } : {}),
      ...(plan.kind === 'course' ? { targetSec: plan.plan.targetSec } : {}),
      // 인터벌 달리기: 반복을 푼 구간 순서 (엔진이 거리 · 시간으로 넘긴다)
      ...(plan.kind === 'interval' ? { workout: flattenBlocks(plan.workout.blocks) } : {}),
      // 앱이 꺼졌다 켜지면 이 계획으로 러닝 화면을 다시 연다
      plan: JSON.stringify(params),
    };
    if (!recovering) {
      engine.prepare(input);
      return;
    }
    // 이어 달리기: 모드 · 코스를 먼저 알려준 뒤 저장된 기록을 불러온다. 남은 기록이 없으면 돌아간다.
    engine
      .prepare(input)
      .then(() => engine.recover())
      .then((snap) => {
        if (snap) {
          launchWatchApp();
          return;
        }
        endActiveRun();
        router.replace('/');
      });
    // 계획은 이 화면에 들어올 때 한 번만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, recovering, courseReady]);

  useEffect(() => {
    if (count < 0) return;
    if (count > 0) haptics.countdownTick();
    else {
      haptics.runStart();
      engine.start();
    }
    if (!reduced) {
      scale.value = 1.35;
      opacity.value = 0;
      scale.value = withTiming(1, { duration: 320 });
      opacity.value = withTiming(1, { duration: 200 });
    }
    const timer = setTimeout(() => setCount((c) => c - 1), count > 0 ? motion.countdownStep : GO_MS);
    return () => clearTimeout(timer);
  }, [count, reduced, scale, opacity, engine]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  const summary =
    plan.kind === 'free'
      ? MODE_TITLE.FREE
      : plan.kind === 'interval'
        ? `${MODE_TITLE.INTERVAL} · ${plan.workout.name}`
        : [
          params.courseName,
          MODE_TITLE[plan.plan.mode],
          plan.plan.targetSec != null ? `목표 ${formatDuration(plan.plan.targetSec)}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  // WATCH-001: 출발 카운트다운과 함께 워치 앱을 켜고 같은 숫자를 보여 준다
  useWatchCountdown(summary, count, !recovering);

  if (count < 0) {
    return (
      <>
        <StatusBar style="light" />
        <ActiveRunScreen
          engine={engine}
          summary={summary}
          course={courseQuery.data ? { id: courseQuery.data.id, name: courseQuery.data.name, route: courseQuery.data.route } : null}
          target={plan.kind === 'course' && plan.plan.targetSec != null ? { sec: plan.plan.targetSec, label: plan.plan.targetLabel ?? '목표' } : null}
          workout={plan.kind === 'interval' ? plan.workout : null}
        />
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
        <SecondaryButton
          label="취소"
          onPress={() => {
            endActiveRun();
            sendWatchIdle();
            router.back();
          }}
          style={styles.cancel}
        />
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
