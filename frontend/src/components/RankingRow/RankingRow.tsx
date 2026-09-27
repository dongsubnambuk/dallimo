import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, stroke, touchTarget, typography } from '@/design/tokens';
import { EMPTY_VALUE, formatCount, formatDuration } from '@/shared/format';

export type RankingRelation = 'normal' | 'self' | 'friend';

export type RankingRowProps = {
  // null이면 순위 없음(unranked)
  rank: number | null;
  name: string;
  timeSec: number;
  relation?: RankingRelation;
  // 이전 대비 순위 변화. 양수면 상승.
  rankChange?: number;
  style?: StyleProp<ViewStyle>;
};

const PODIUM_MAX = 3;

// 113장: self anchor over decoration. 89장: podium은 과장하지 않는다.
// nearby는 목록에서 self 전후 행을 보여주는 배치이며 행 자체는 normal과 같다.
export function RankingRow({ rank, name, timeSec, relation = 'normal', rankChange, style }: RankingRowProps) {
  const { colors } = useTheme();
  const isSelf = relation === 'self';
  const isPodium = rank != null && rank <= PODIUM_MAX;
  const rankText = rank == null ? EMPTY_VALUE : formatCount(rank);
  const time = formatDuration(timeSec);

  const a11y = [
    rank == null ? '순위 없음' : `${rank}위`,
    name,
    isSelf ? '나' : relation === 'friend' ? '친구' : null,
    time,
    rankChange ? `${Math.abs(rankChange)}계단 ${rankChange > 0 ? '상승' : '하락'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[
        styles.root,
        isSelf && { backgroundColor: colors.bg.surface, borderLeftColor: colors.action.primary },
        style,
      ]}
    >
      <AppText role={isPodium ? 'sectionTitle' : 'body'} tabular style={styles.rank} numberOfLines={1}>
        {rankText}
      </AppText>
      <View style={styles.nameBlock}>
        <AppText role="body" numberOfLines={1} style={[styles.name, (isSelf || isPodium) && styles.strong]}>
          {name}
        </AppText>
        {isSelf ? <Tag text="나" /> : relation === 'friend' ? <Tag text="친구" /> : null}
      </View>
      {rankChange ? (
        <View style={styles.change}>
          <AppIcon
            name={rankChange > 0 ? 'rankUp' : 'rankDown'}
            size={16}
            color={rankChange > 0 ? colors.ranking.up : colors.ranking.down}
          />
          <AppText role="caption" tone="secondary" tabular>
            {Math.abs(rankChange)}
          </AppText>
        </View>
      ) : null}
      <AppText role="body" tabular style={styles.time}>
        {time}
      </AppText>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { borderColor: colors.border.subtle }]}>
      <AppText role="caption" tone="secondary">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: stroke.signal,
    borderLeftColor: 'transparent',
  },
  rank: {
    // 4자리 순위("1,234")까지 정렬이 유지되도록 최소 폭만 두고 필요하면 늘어난다.
    minWidth: spacing.huge,
  },
  nameBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
  strong: {
    fontWeight: typography.sectionTitle.fontWeight,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    flexShrink: 0,
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
});
