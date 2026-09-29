import { StyleSheet, View } from 'react-native';

import { GapIndicator } from '@/components/GapIndicator';
import { MetricBlock } from '@/components/MetricBlock';
import { SignalRail } from '@/components/SignalRail';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getRunPolicySync } from '@/entities/run/policy';
import { endLabel, flatStepTitle, STEP_LABEL, targetLabel } from '@/entities/workout/labels';
import { intervalNow, targetGap } from '@/entities/workout/tracker';
import type { FlatStep, StepBoundary } from '@/entities/workout/types';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import type { RunningEngine } from '@/features/run/engine/runningEngine';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';
import { haptics } from '@/shared/haptics';

import { useElapsedSec } from '../useElapsedSec';

const NO_BOUNDARIES: StepBoundary[] = [];

// 123.2장 TrainingRunHUD: 지금 구간 · 남은 거리/시간 · 목표 · 목표와의 차이 · 다음 구간만 크게 (INTERVAL-TRAINING-SPEC "Do not overload").
// 전체 거리 · 시간은 아래 작은 줄로. 직접 넘기는 구간이면 "다음 구간" 버튼.
export function IntervalPanel({ engine, flat }: { engine: RunningEngine; flat: FlatStep[] }) {
  const { colors } = useTheme();
  const boundaries = useRunSnapshot(engine, (s) => s.interval?.boundaries ?? NO_BOUNDARIES);
  const distance = useRunSnapshot(engine, (s) => s.distanceM);
  const status = useRunSnapshot(engine, (s) => s.status);
  const sec = useElapsedSec(engine);
  const now = intervalNow(flat, boundaries, { activeMs: sec * 1000, distanceM: distance });
  const step = now.step;

  if (!step) {
    return (
      <View style={styles.root}>
        <View style={styles.done} accessible accessibilityLiveRegion="polite" accessibilityLabel="인터벌을 모두 마쳤어요. 더 달려도 되고, 아래 인터벌 기록 저장을 누르면 끝나요">
          <AppIcon name="finished" size={40} color={colors.text.accent} />
          <AppText role="screenTitle">인터벌 완료</AppText>
          <AppText role="body" tone="secondary" style={styles.center}>
            더 달려도 되고, 아래 &quot;인터벌 기록 저장&quot;을 누르면 끝나요
          </AppText>
        </View>
        <Totals distance={distance} sec={sec} />
      </View>
    );
  }

  const r = now.remaining;
  const hero =
    r.kind === 'distance'
      ? { value: String(Math.ceil(r.m)), unit: 'm 남음', a11y: `${Math.ceil(r.m)}미터 남음` }
      : r.kind === 'time'
        ? { value: formatDuration(Math.ceil(r.sec)), unit: '남음', a11y: `${formatDuration(Math.ceil(r.sec))} 남음` }
        : { value: formatDuration(now.elapsedSec), unit: '지남', a11y: `${formatDuration(now.elapsedSec)} 지남` };
  const target = targetLabel(step);
  const gap = targetGap(step, now.elapsedSec, now.distanceM, getRunPolicySync().minPaceSampleM);
  const work = step.stepType === 'WORK';

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={[styles.chip, { backgroundColor: work ? colors.action.primary : colors.bg.surface }]}>
          <AppText role="sectionTitle" style={[styles.bold, { color: work ? colors.action.onPrimary : colors.text.primary }]}>
            {flatStepTitle(step)}
          </AppText>
        </View>
        <AppText role="label" tone="secondary" tabular>
          구간 {now.index + 1}/{flat.length}
        </AppText>
      </View>

      <View style={styles.hero} accessible accessibilityLabel={`${STEP_LABEL[step.stepType]} ${endLabel(step)}, ${hero.a11y}`}>
        <AppText role="metricGiant" tabular maxFontSizeMultiplier={1.1}>
          {hero.value}
        </AppText>
        <AppText role="sectionTitle" tone="secondary">
          {hero.unit}
        </AppText>
      </View>
      {now.progress != null ? <SignalRail progress={now.progress} showHead tone={work ? 'signal' : 'muted'} /> : null}

      {target ? (
        <View style={[styles.target, { backgroundColor: colors.bg.surface }]}>
          <TargetState gap={gap} exact={step.targetMin != null && step.targetMin === step.targetMax} pace={step.targetType === 'TARGET_PACE'} maxOnly={step.targetMin == null} />
          <View style={styles.targetRight}>
            <AppText role="label" tone="secondary">
              {target}
            </AppText>
            <AppText role="label" tabular style={styles.bold}>
              {step.targetType === 'TARGET_PACE' ? `지금 ${formatPace(now.distanceM > 0 ? now.elapsedSec / (now.distanceM / 1000) : null)}` : `지금 ${formatDuration(now.elapsedSec)}`}
            </AppText>
          </View>
        </View>
      ) : null}

      {step.endConditionType === 'MANUAL' ? (
        <AppPressable
          onPress={() => {
            haptics.runControl();
            engine.nextIntervalStep();
          }}
          disabled={status !== 'RUNNING' && status !== 'PAUSED'}
          accessibilityLabel="다음 구간으로"
          style={[styles.next, { backgroundColor: colors.action.secondary }]}
        >
          <AppIcon name="skipNext" size={22} color={colors.action.onSecondary} />
          <AppText role="sectionTitle" style={[styles.bold, { color: colors.action.onSecondary }]}>
            다음 구간
          </AppText>
        </AppPressable>
      ) : null}

      <AppText role="body" tone="secondary" numberOfLines={1}>
        {now.next ? `다음 · ${flatStepTitle(now.next)} ${endLabel(now.next)}` : '마지막 구간이에요'}
      </AppText>
      <Totals distance={distance} sec={sec} />
    </View>
  );
}

// 목표와의 차이. 목표 범위 · 최대 안이면 "목표 안"으로 (같음이 아니라)
function TargetState({ gap, exact, pace, maxOnly }: { gap: ReturnType<typeof targetGap>; exact: boolean; pace: boolean; maxOnly: boolean }) {
  const { colors } = useTheme();
  const label = pace ? '목표 페이스' : '목표';
  if (!gap) {
    const text = `${getRunPolicySync().minPaceSampleM}m 달리면 비교해요`;
    return (
      <View style={[styles.gap, styles.within]} accessible accessibilityLabel={text}>
        <AppIcon name="noData" size={16} color={colors.text.secondary} />
        <AppText role="label" tone="secondary">
          {text}
        </AppText>
      </View>
    );
  }
  const g = Math.round(gap.gap);
  if (g === 0 && !exact) {
    const text = maxOnly ? '최대 시간 안' : '목표 안';
    return (
      <View style={[styles.gap, styles.within]} accessible accessibilityLabel={text}>
        <AppIcon name="check" size={16} color={colors.status.success} />
        <AppText role="label" style={styles.bold}>
          {text}
        </AppText>
      </View>
    );
  }
  return <GapIndicator direction={g === 0 ? 'tied' : g < 0 ? 'ahead' : 'behind'} delta={Math.abs(g)} label={label} size="compact" style={styles.gap} />;
}

function Totals({ distance, sec }: { distance: number; sec: number }) {
  return (
    <View style={styles.totals}>
      <MetricBlock label="전체 거리" value={formatDistanceKm(distance)} unit="km" size="medium" align="center" style={styles.flex} />
      <MetricBlock label="전체 시간" value={formatDuration(sec)} size="medium" align="center" style={styles.flex} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  gap: {
    flex: 1,
  },
  within: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  targetRight: {
    alignItems: 'flex-end',
  },
  next: {
    minHeight: touchTarget.min + spacing.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  totals: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  done: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
});
