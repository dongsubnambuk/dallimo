import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { EMPTY_VALUE, formatCount, formatDuration, formatPace } from '@/shared/format';

export type RankingRelation = 'normal' | 'self' | 'friend';

export type RankingRowProps = {
  // null이면 순위 없음(unranked)
  rank: number | null;
  name: string;
  timeSec: number;
  paceSecPerKm?: number;
  relation?: RankingRelation;
  // 이 기록이 본인 PB인지
  isPB?: boolean;
  // 이전 대비 순위 변화. 양수면 상승.
  rankChange?: number;
  style?: StyleProp<ViewStyle>;
};

const PODIUM_MAX = 3;
const BADGE = 28;

// 113장: self anchor over decoration. 89장: podium은 과장하지 않는다 (금·은·동 색 대신 검정 원 배지만).
// 레퍼런스: 토스증권·열품타·워크온 랭킹 — 순위 · 이름 · 기록(아래 페이스). 본인 행은 민트 연한 배경 + "나" 표시.
export function RankingRow({
  rank,
  name,
  timeSec,
  paceSecPerKm,
  relation = 'normal',
  isPB = false,
  rankChange,
  style,
}: RankingRowProps) {
  const { colors } = useTheme();
  const isSelf = relation === 'self';
  const isPodium = rank != null && rank <= PODIUM_MAX;
  const strong = isSelf || isPodium;
  const rankText = rank == null ? EMPTY_VALUE : formatCount(rank);
  const time = formatDuration(timeSec);
  const pace = paceSecPerKm != null ? `${formatPace(paceSecPerKm)}/km` : null;

  const a11y = [
    rank == null ? '순위 없음' : `${rank}위`,
    name,
    isSelf ? '나' : relation === 'friend' ? '친구' : null,
    isPB ? '개인 최고 기록' : null,
    time,
    rankChange ? `${Math.abs(rankChange)}계단 ${rankChange > 0 ? '상승' : '하락'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[styles.root, isSelf && [styles.self, { backgroundColor: colors.action.tint }], style]}
    >
      <View style={[styles.badge, isPodium && { backgroundColor: colors.action.secondary }]}>
        <AppText
          role="label"
          tabular
          tone={strong ? 'primary' : 'secondary'}
          style={[strong && styles.extrabold, isPodium && { color: colors.action.onSecondary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {rankText}
        </AppText>
      </View>
      <View style={styles.nameBlock}>
        <AppText role="body" numberOfLines={1} style={styles.name}>
          {name}
        </AppText>
        {isSelf ? <Pill text="나" filled="ink" /> : null}
        {isPB ? <Pill text="PB" filled="signal" /> : null}
        {relation === 'friend' ? <Pill text="친구" /> : null}
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
      <View style={styles.record}>
        <AppText role="label" tabular style={styles.extrabold}>
          {time}
        </AppText>
        {pace ? (
          <AppText role="caption" tone="secondary" tabular>
            {pace}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function Pill({ text, filled }: { text: string; filled?: 'signal' | 'ink' }) {
  const { colors } = useTheme();
  const bg = filled === 'signal' ? colors.action.primary : filled === 'ink' ? colors.action.secondary : undefined;
  const fg = filled === 'signal' ? colors.action.onPrimary : filled === 'ink' ? colors.action.onSecondary : colors.text.secondary;
  return (
    <View style={[styles.pill, bg ? { backgroundColor: bg } : { borderColor: colors.border.strong, borderWidth: StyleSheet.hairlineWidth }]}>
      <AppText role="caption" style={[styles.pillText, { color: fg }]}>
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
    paddingHorizontal: spacing.md,
  },
  self: {
    borderRadius: radius.control,
    borderCurve: 'continuous',
  },
  badge: {
    // 4자리 순위까지는 원형 배지 안에서 글자 크기를 줄여 맞춘다.
    minWidth: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    paddingHorizontal: spacing.xs / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extrabold: {
    fontFamily: fontFamily.black,
  },
  nameBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  record: {
    alignItems: 'flex-end',
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs + spacing.xs / 2,
  },
  pillText: {
    fontFamily: fontFamily.bold,
  },
});
