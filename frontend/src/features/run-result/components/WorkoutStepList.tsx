import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { getRunPolicySync } from '@/entities/run/policy';
import { flatStepTitle, formatStepDistance, targetLabel } from '@/entities/workout/labels';
import { resultGap } from '@/entities/workout/tracker';
import type { StepResult } from '@/entities/workout/types';
import { gapWords } from '@/features/run/voice/intervalCues';
import { formatDuration, formatPace } from '@/shared/format';

// 123.2장 WorkoutResult: 구간별 실제 시간 · 평균 페이스 · 목표와의 차이. 맨 위에 빠르게 구간 평균.
export function WorkoutStepList({ steps }: { steps: StepResult[] }) {
  const { colors } = useTheme();
  const minSample = getRunPolicySync().minPaceSampleM;
  const work = steps.filter((s) => s.stepType === 'WORK' && s.completed);
  const avgSec = work.length > 1 ? work.reduce((a, s) => a + s.elapsedSec, 0) / work.length : null;
  const workM = work.reduce((a, s) => a + s.distanceM, 0);
  const avgPace = avgSec != null && workM > 0 ? work.reduce((a, s) => a + s.elapsedSec, 0) / (workM / 1000) : null;

  return (
    <View style={styles.root}>
      {avgSec != null ? (
        <View style={[styles.avg, { backgroundColor: colors.action.tint }]} accessible accessibilityLabel={`빠르게 ${work.length}번 평균 ${formatDuration(avgSec)}, 페이스 ${formatPace(avgPace)}`}>
          <AppText role="label" style={styles.bold}>
            빠르게 {work.length}번 평균
          </AppText>
          <AppText role="label" tabular style={styles.bold}>
            {formatDuration(avgSec)} · {formatPace(avgPace)}/km
          </AppText>
        </View>
      ) : null}
      {steps.map((s, i) => {
        const gap = resultGap(s, minSample);
        const words = gapWords(s, gap);
        const g = gap ? Math.round(gap.gap) : null;
        const tone = g == null ? colors.text.secondary : g <= 0 ? colors.status.success : colors.status.danger;
        const pace = s.distanceM >= minSample ? s.elapsedSec / (s.distanceM / 1000) : null;
        const target = targetLabel(s);
        const label = [
          flatStepTitle(s),
          formatDuration(s.elapsedSec),
          formatStepDistance(s.distanceM),
          pace != null ? `페이스 ${formatPace(pace)}` : null,
          target,
          words,
          s.completed ? null : '중간에 끝냄',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <View key={i} style={[styles.row, { borderBottomColor: colors.border.subtle }]} accessible accessibilityLabel={label}>
            <View style={[styles.mark, { backgroundColor: s.stepType === 'WORK' ? colors.action.primary : s.stepType === 'RECOVERY' ? colors.text.secondary : colors.border.subtle }]} />
            <View style={styles.flex}>
              <AppText role="body" style={styles.bold} numberOfLines={1}>
                {flatStepTitle(s)}
              </AppText>
              <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
                {[formatStepDistance(s.distanceM), pace != null ? `${formatPace(pace)}/km` : null, target].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            <View style={styles.right}>
              <AppText role="body" tabular style={styles.bold}>
                {formatDuration(s.elapsedSec)}
              </AppText>
              {!s.completed ? (
                <AppText role="caption" style={{ color: colors.status.warning }}>
                  중간에 끝냄
                </AppText>
              ) : words ? (
                <View style={styles.gap}>
                  {g != null && g !== 0 ? <AppIcon name={g < 0 ? 'ahead' : 'behind'} size={12} color={tone} /> : <AppIcon name="check" size={12} color={tone} />}
                  <AppText role="caption" style={{ color: tone }}>
                    {shortGap(words)}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// "목표보다 2초 빨라요" → "2초 빠름", "최대 시간 안이에요" → "최대 안"
function shortGap(words: string): string {
  return words
    .replace(/^목표 페이스보다 /, '')
    .replace(/^목표보다 /, '')
    .replace(/빨라요$/, '빠름')
    .replace(/느려요$/, '느림')
    .replace('최대 시간 안이에요', '최대 안')
    .replace('목표 안이에요', '목표 안')
    .replace(/와 같아요$/, '와 같음');
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  avg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: radius.control,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mark: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  right: {
    alignItems: 'flex-end',
  },
  gap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
