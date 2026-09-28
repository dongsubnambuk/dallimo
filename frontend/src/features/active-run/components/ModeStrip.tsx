import { StyleSheet, View } from 'react-native';

import { GapIndicator, type GapDirection } from '@/components/GapIndicator';
import { SignalRail } from '@/components/SignalRail';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { targetGapSec } from '@/entities/run/courseProgress';
import { getRunPolicySync } from '@/entities/run/policy';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import type { RunningEngine } from '@/features/run/engine/runningEngine';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import { useElapsedSec } from '../useElapsedSec';

export type RunTarget = { sec: number; label: string };

// 92장: 모드별로 가운데 강조 strip만 바뀐다. FREE는 split, COURSE는 진행률/이탈, PB·CHALLENGE는 gap.
export function ModeStrip({ engine, target }: { engine: RunningEngine; target: RunTarget | null }) {
  const mode = useRunSnapshot(engine, (s) => s.mode);
  const hasCourse = useRunSnapshot(engine, (s) => s.course != null);
  if (!hasCourse) return <SplitStrip engine={engine} />;
  if ((mode === 'PB' || mode === 'CHALLENGE') && target) return <GapStrip engine={engine} target={target} />;
  return <CourseStrip engine={engine} />;
}

// FREE: 현재 페이스 + 지난 1km 스플릿 + 다음 1km까지 진행 (62.1장 FREE 2차 정보 split)
function SplitStrip({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  const splits = useRunSnapshot(engine, (s) => s.splits);
  const current = useRunSnapshot(engine, (s) => s.currentPaceSec);
  const last = splits[splits.length - 1] ?? null;
  const nextKm = Math.floor(d / 1000) + 1;
  const toNext = Math.max(0, nextKm * 1000 - d);

  return (
    <View style={[styles.strip, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.row}>
        <Stat label="현재 페이스" value={formatPace(current)} a11y={`현재 페이스 ${current == null ? '측정 중' : formatPace(current)}`} />
        <Stat
          label={last ? `${last.km}km 구간` : '첫 1km 구간'}
          value={last ? formatDuration(last.sec) : '--'}
          tone={last ? 'accent' : 'secondary'}
          align="end"
          a11y={last ? `${last.km}킬로미터 구간 ${formatDuration(last.sec)}` : '첫 1킬로미터 구간 측정 중'}
        />
      </View>
      <SignalRail progress={(d % 1000) / 1000} showHead />
      <AppText role="caption" tone="secondary" tabular>
        {nextKm}km까지 {Math.round(toNext)}m
      </AppText>
    </View>
  );
}

// COURSE: 코스 기준 진행률(CRUN-002) + 남은 거리 + 코스 위/이탈(CRUN-003). 62.1장 COURSE 1차: 진행률·거리·이탈·페이스
function CourseStrip({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const course = useRunSnapshot(engine, (s) => s.course);
  const current = useRunSnapshot(engine, (s) => s.currentPaceSec);
  if (!course) return null;
  const ratio = Math.min(1, course.progressM / course.lengthM);
  const done = course.completedActiveMs != null;
  const remainM = Math.max(0, course.lengthM - course.progressM);

  return (
    <View style={[styles.strip, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.row}>
        <Stat
          label="코스 진행"
          value={`${Math.floor(ratio * 100)}%`}
          tone="accent"
          big
          a11y={`코스 진행 ${Math.floor(ratio * 100)}퍼센트`}
        />
        <Stat
          label={done ? '완주' : '남은 거리'}
          value={done ? formatDuration(Math.round(course.completedActiveMs! / 1000)) : `${formatDistanceKm(remainM)} km`}
          align="end"
          a11y={done ? `완주 기록 ${formatDuration(Math.round(course.completedActiveMs! / 1000))}` : `남은 거리 ${formatDistanceKm(remainM)} 킬로미터`}
        />
      </View>
      <SignalRail progress={ratio} showHead />
      <View style={styles.row}>
        <RouteState offRouteM={course.offRouteM} done={done} />
        <AppText role="caption" tone="secondary" tabular>
          현재 {formatPace(current)}
        </AppText>
      </View>
    </View>
  );
}

// PB ATTACK / CHALLENGE: 목표 대비 시간 gap + 목표 기록 + 진행률 + 예상 완주 (62.1장)
function GapStrip({ engine, target }: { engine: RunningEngine; target: RunTarget }) {
  const { colors } = useTheme();
  const course = useRunSnapshot(engine, (s) => s.course);
  const sec = useElapsedSec(engine);
  if (!course) return null;
  const policy = getRunPolicySync();
  const done = course.completedActiveMs != null;
  const ratio = Math.min(1, course.progressM / course.lengthM);
  const runSec = done ? Math.round(course.completedActiveMs! / 1000) : sec;
  const enough = course.progressM >= policy.minPaceSampleM;
  const gap = enough ? targetGapSec(done ? course.lengthM : course.progressM, course.lengthM, runSec, target.sec) : 0;
  const rounded = Math.round(gap);
  const direction: GapDirection = !enough ? 'noData' : rounded === 0 ? 'tied' : rounded < 0 ? 'ahead' : 'behind';
  const predicted = enough && !done ? (runSec * course.lengthM) / course.progressM : null;

  return (
    <View style={[styles.strip, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.row}>
        <GapIndicator direction={direction} delta={rounded} label="목표" style={styles.gap} />
        <Stat label={target.label} value={formatDuration(target.sec)} align="end" a11y={`목표 ${target.label} ${formatDuration(target.sec)}`} />
      </View>
      <SignalRail progress={ratio} showHead />
      <View style={styles.row}>
        <RouteState offRouteM={course.offRouteM} done={done} />
        <AppText role="caption" tone="secondary" tabular>
          {done ? `완주 ${formatDuration(runSec)}` : `예상 완주 ${formatDuration(predicted)}`}
        </AppText>
      </View>
    </View>
  );
}

// 색만으로 구분하지 않도록 아이콘 + 문구를 함께 쓴다 (ACCESSIBILITY)
function RouteState({ offRouteM, done }: { offRouteM: number | null; done: boolean }) {
  const { colors } = useTheme();
  const off = offRouteM != null && !done;
  const text = done ? '코스 완주' : off ? `코스에서 ${offRouteM}m 벗어남` : '코스 위';
  const color = off ? colors.status.warning : colors.text.accent;
  return (
    <View style={styles.state} accessible accessibilityLabel={text}>
      <AppIcon name={off ? 'warning' : 'check'} size={14} color={color} />
      <AppText role="caption" style={[styles.stateText, { color }]}>
        {text}
      </AppText>
    </View>
  );
}

function Stat({
  label,
  value,
  a11y,
  tone = 'primary',
  align = 'start',
  big = false,
}: {
  label: string;
  value: string;
  a11y: string;
  tone?: 'primary' | 'secondary' | 'accent';
  align?: 'start' | 'end';
  big?: boolean;
}) {
  return (
    <View accessible accessibilityLabel={a11y} style={[styles.stat, align === 'end' && styles.end]}>
      <AppText role="caption" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText role={big ? 'screenTitle' : 'sectionTitle'} tabular tone={tone} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  stat: {
    flexShrink: 1,
  },
  end: {
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: fontFamily.extrabold,
  },
  gap: {
    flexShrink: 1,
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stateText: {
    fontFamily: fontFamily.bold,
  },
});
