import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, stroke } from '@/design/tokens';
import type { RunSplit } from '@/entities/run/types';
import { formatPace } from '@/shared/format';

// 1km 구간 기록 (RST-001 구간 페이스). 63.1장: 세부 분석은 결과 화면 맨 아래.
// 막대는 가장 빠른 구간을 가득 채운 기준으로 비교한다. 가장 빠른 구간은 민트로 표시하고 "최고" 문구도 붙인다.
export function SplitList({ splits }: { splits: RunSplit[] }) {
  const { colors } = useTheme();
  if (splits.length === 0) {
    return (
      <AppText role="body" tone="secondary">
        1km를 넘게 달리면 구간 기록이 생겨요
      </AppText>
    );
  }
  const fastest = Math.min(...splits.map((s) => s.sec));
  const slowest = Math.max(...splits.map((s) => s.sec));

  return (
    <View style={styles.root}>
      {splits.map((s) => {
        const best = s.sec === fastest && splits.length > 1;
        // 가장 느린 구간도 막대가 보이도록 60%를 바닥으로 둔다
        const ratio = slowest === fastest ? 1 : 1 - (0.4 * (s.sec - fastest)) / (slowest - fastest);
        return (
          <View key={s.km} style={styles.row} accessible accessibilityLabel={`${s.km}킬로미터 ${formatPace(s.sec)}${best ? ', 가장 빠른 구간' : ''}`}>
            <AppText role="label" tone="secondary" tabular style={styles.km}>
              {s.km}km
            </AppText>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: `${ratio * 100}%`, backgroundColor: best ? colors.action.primary : colors.text.primary }]} />
            </View>
            <AppText role="label" tabular style={styles.pace}>
              {formatPace(s.sec)}
            </AppText>
            <AppText role="caption" tone="accent" style={styles.best}>
              {best ? '최고' : ''}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  km: {
    width: 36,
  },
  barTrack: {
    flex: 1,
  },
  bar: {
    height: stroke.signal * 2,
    borderRadius: radius.pill,
  },
  pace: {
    width: 48,
    textAlign: 'right',
  },
  best: {
    width: 28,
  },
});
