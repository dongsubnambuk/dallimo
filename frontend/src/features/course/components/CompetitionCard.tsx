import { StyleSheet, View } from 'react-native';

import { VerificationBadge } from '@/components/VerificationBadge';
import type { CourseDetail } from '@/entities/course/types';
import { AppDivider, AppIcon, AppText, type IconName } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, OBLIQUE_SKEW, radius, spacing } from '@/design/tokens';
import { formatCount, formatDuration } from '@/shared/format';

// 2차 정보: 내 PB · 주간 순위 · 친구 최고 · 코스 1위 (61.1장, 91장). "내가 왜 달려야 하는지"를 보여주는 카드.
// 탐색의 코스 티켓과 같은 검정(dark 컨텍스트) 표면을 써서 두 화면을 하나의 경쟁 언어로 잇는다.
export function CompetitionCard({ course }: { course: CourseDetail }) {
  return (
    <ThemeProvider scheme="dark">
      <CompetitionBody course={course} />
    </ThemeProvider>
  );
}

function CompetitionBody({ course }: { course: CourseDetail }) {
  const { colors } = useTheme();
  const { myRecord: me, competition: comp } = course;
  const gapToLeader = me && comp?.leaderSec != null ? me.bestSec - comp.leaderSec : null;
  const gapToFriend = me && comp?.friendBest ? me.bestSec - comp.friendBest.timeSec : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      {me ? (
        <View style={styles.head}>
          <View style={styles.headTop}>
            <AppText role="label" tone="secondary">
              내 PB
            </AppText>
            <VerificationBadge status={me.bestVerification} />
          </View>
          <View style={styles.pbRow}>
            <AppText role="metricLarge" tone="accent" tabular style={styles.pb} numberOfLines={1}>
              {formatDuration(me.bestSec)}
            </AppText>
            {comp?.myWeeklyRank != null ? (
              <View style={styles.rank}>
                <AppText role="caption" tone="secondary">
                  이번 주
                </AppText>
                <AppText role="sectionTitle" tabular style={styles.rankValue}>
                  {formatCount(comp.myWeeklyRank)}위
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText role="caption" tone="secondary" tabular>
            최근 {formatDuration(me.lastSec)} · {formatCount(me.finishCount)}회 완주
          </AppText>
        </View>
      ) : (
        <View style={styles.head}>
          <AppText role="sectionTitle" style={styles.emptyTitle}>
            아직 이 코스 기록이 없어요
          </AppText>
          <AppText role="label" tone="accent">
            첫 완주 기록이 이번 주 랭킹에 올라가요
          </AppText>
        </View>
      )}

      <AppDivider />

      {comp ? (
        <View style={styles.rows}>
          <Row
            icon="trophy"
            label="코스 1위"
            value={comp.leaderSec != null ? formatDuration(comp.leaderSec) : '인증 기록 없음'}
            note={gapToLeader != null && gapToLeader > 0 ? `1위까지 ${formatDuration(gapToLeader)}` : undefined}
          />
          {comp.friendBest ? (
            <Row
              icon="tabTogether"
              label={`친구 최고 · ${comp.friendBest.name}`}
              value={formatDuration(comp.friendBest.timeSec)}
              note={
                gapToFriend == null
                  ? undefined
                  : gapToFriend > 0
                    ? `${formatDuration(gapToFriend)} 느림`
                    : gapToFriend < 0
                      ? `${formatDuration(-gapToFriend)} 빠름`
                      : '같음'
              }
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.unavailable}>
          <AppIcon name="warning" size={16} color={colors.status.warning} />
          <AppText role="label" tone="secondary" style={styles.flex}>
            랭킹·기록 인증 정보를 불러오지 못했어요. 코스를 달리는 데는 문제없어요.
          </AppText>
        </View>
      )}
    </View>
  );
}

function Row({ icon, label, value, note }: { icon: IconName; label: string; value: string; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={[label, value, note].filter(Boolean).join(', ')}>
      <AppIcon name={icon} size={16} color={colors.text.secondary} />
      <AppText role="label" tone="secondary" style={styles.flex} numberOfLines={1}>
        {label}
      </AppText>
      <AppText role="label" tabular style={styles.rowValue}>
        {value}
      </AppText>
      {note ? (
        <AppText role="caption" tone="secondary" tabular>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    padding: spacing.lg + spacing.xs,
    gap: spacing.md,
  },
  head: {
    gap: spacing.xs,
  },
  headTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pb: {
    fontSize: 44,
    lineHeight: 50,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  rank: {
    alignItems: 'flex-end',
  },
  rankValue: {
    fontFamily: fontFamily.extrabold,
  },
  emptyTitle: {
    fontFamily: fontFamily.extrabold,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    fontFamily: fontFamily.extrabold,
  },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
