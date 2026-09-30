import { StyleSheet, View } from 'react-native';

import { AppDivider, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { segmentName, type CourseSegments } from '@/entities/ranking/types';
import { formatCount, formatDistanceKm, formatDuration } from '@/shared/format';

// 124장 Segment Attack: 코스 구간(약 1km)마다 구간 1위와 내 최고. 달리다 구간에 들어서면 이 기록과 비교한다
export function CourseSegmentsCard({ data }: { data: CourseSegments }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.surface }]}>
      {data.segments.map((s, i) => {
        const range = `${s.startM === 0 ? '0' : formatDistanceKm(s.startM, 1)}~${formatDistanceKm(s.endM, 1)}km`;
        const leader = s.leader ? `1위 ${s.leader.name}${s.leader.relation === 'self' ? ' (나)' : ''}` : '아직 기록이 없어요';
        const gap = s.myBestSec != null && s.leader && s.leader.relation !== 'self' ? s.myBestSec - s.leader.timeSec : null;
        const mine = s.myBestSec != null ? `내 최고 ${formatDuration(s.myBestSec)}${gap != null && gap > 0 ? ` · 1위까지 ${formatDuration(gap)}` : ''}` : null;
        return (
          <View key={s.index}>
            {i > 0 ? <AppDivider /> : null}
            <View
              style={styles.row}
              accessible
              accessibilityLabel={[segmentName(s.index), range, leader, s.leader ? formatDuration(s.leader.timeSec) : null, mine, `${s.runnerCount}명 기록`].filter(Boolean).join(', ')}
            >
              <View style={styles.flex}>
                <View style={styles.head}>
                  <AppText role="label" style={styles.bold}>
                    {segmentName(s.index)}
                  </AppText>
                  <AppText role="caption" tone="secondary" tabular>
                    {range} · {formatCount(s.runnerCount)}명
                  </AppText>
                </View>
                <AppText role="body" tone={s.leader ? 'primary' : 'secondary'} numberOfLines={1}>
                  {leader}
                </AppText>
                {mine ? (
                  <AppText role="caption" tone="secondary" tabular>
                    {mine}
                  </AppText>
                ) : null}
              </View>
              {s.leader ? (
                <AppText role="sectionTitle" tabular style={styles.value}>
                  {formatDuration(s.leader.timeSec)}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  value: {
    fontFamily: fontFamily.extrabold,
  },
});
