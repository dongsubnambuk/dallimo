import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, spacing } from '@/design/tokens';
import { segmentName } from '@/entities/ranking/types';
import type { RunSegmentResult } from '@/entities/run/result';
import { formatDuration } from '@/shared/format';

// 124장 Segment Attack 결과: 코스 구간(약 1km)마다 기록 · 구간 PB · 구간 순위. 서버가 인증 뒤 GPS point로 잰 값이다
export function SegmentResultList({ segments }: { segments: RunSegmentResult[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      {segments.map((s) => {
        const behind = s.timeSec - s.leaderSec;
        const note = s.rank === 1 ? '구간 1위' : behind > 0 ? `${s.rank}위 · 1위와 ${formatDuration(behind)}` : `${s.rank}위`;
        const pb = s.personalBest ? (s.previousBestSec == null ? '첫 기록' : `구간 PB · ${formatDuration(s.previousBestSec - s.timeSec)} 단축`) : null;
        return (
          <View key={s.index} style={styles.row} accessible accessibilityLabel={[segmentName(s.index), formatDuration(s.timeSec), pb, note].filter(Boolean).join(', ')}>
            <AppText role="label" tone="secondary" style={styles.name}>
              {segmentName(s.index)}
            </AppText>
            <View style={styles.flex}>
              {pb ? (
                <View style={styles.tag}>
                  <AppIcon name="rankUp" size={14} color={colors.text.accent} />
                  <AppText role="caption" tone="accent" style={styles.bold}>
                    {pb}
                  </AppText>
                </View>
              ) : null}
              <AppText role="caption" tone={s.rank === 1 ? 'accent' : 'secondary'} tabular>
                {note}
              </AppText>
            </View>
            <AppText role="sectionTitle" tabular style={styles.bold}>
              {formatDuration(s.timeSec)}
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
    paddingVertical: spacing.xs,
  },
  name: {
    width: 52,
  },
  flex: {
    flex: 1,
    gap: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
