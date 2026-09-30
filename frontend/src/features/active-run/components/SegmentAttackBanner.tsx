import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import type { RunningEngine } from '@/features/run/engine/runningEngine';
import { segmentLine } from '@/features/run/segment/segmentLine';
import type { SegmentAttack } from '@/features/run/segment/useSegmentAttack';

import { useElapsedSec } from '../useElapsedSec';

// 127장 SegmentAttackBanner: 코스 구간(약 1km)에 들어서면 한 줄로 "구간 2/3 도전 · 내 최고보다 0:03 빨라요".
// 구간이 끝나면 잠깐 구간 기록과 비교를 보여 준다. 한눈에 읽히게 한 줄 + 작은 설명 한 줄만 (CLAUDE.md 6항)
export function SegmentAttackBanner({ engine, attack }: { engine: RunningEngine; attack: SegmentAttack }) {
  const { colors } = useTheme();
  const sec = useElapsedSec(engine);
  const fraction = useRunSnapshot(engine, (s) => (s.course && s.course.lengthM > 0 ? Math.min(1, s.course.progressM / s.course.lengthM) : 0));
  const line = segmentLine(attack, fraction, sec);
  if (!line) return null;
  const color = line.tone === 'accent' ? colors.text.accent : line.tone === 'warning' ? colors.status.warning : colors.text.primary;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg.surface }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={[line.label, line.value, line.note].filter(Boolean).join(', ')}
    >
      <AppIcon name="modeCourse" size={16} color={colors.text.secondary} />
      <View style={styles.body}>
        <View style={styles.row}>
          <AppText role="label" tone="secondary" numberOfLines={1} style={styles.flex}>
            {line.label}
          </AppText>
          <AppText role="sectionTitle" tabular style={[styles.value, { color }]}>
            {line.value}
          </AppText>
        </View>
        {line.note ? (
          <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
            {line.note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
  },
  body: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  value: {
    fontFamily: fontFamily.extrabold,
  },
});
