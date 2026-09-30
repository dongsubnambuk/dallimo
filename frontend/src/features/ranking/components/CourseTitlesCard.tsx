import { StyleSheet, View } from 'react-native';

import { COURSE_TITLE_LABEL, CourseTitleBadge, type CourseTitleKind } from '@/components/CourseTitleBadge';
import { AppDivider, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import type { CourseTitles, TitleHolder } from '@/entities/ranking/types';
import { formatCount, formatDuration } from '@/shared/format';

// 124장 코스 크라운 · 로컬 레전드 (127장 CourseCrownBadge · LocalLegendRow).
// 한 줄에 타이틀 · 가진 사람 · 값, 아래에 내가 얼마나 남았는지. 크라운은 기록, 레전드는 반복 참여라 두 줄로 나눈다.
export function CourseTitlesCard({ titles }: { titles: CourseTitles }) {
  const { colors } = useTheme();
  const { crown, legend } = titles;

  const crownNote = crown.holder
    ? crown.me?.holder
      ? { text: '지금 크라운이에요', accent: true }
      : crown.me
        ? { text: `크라운까지 ${formatDuration(crown.me.gapSec)}`, accent: false }
        : null
    : { text: `${crown.periodDays}일 안 첫 인증 기록이 크라운이 돼요`, accent: false };

  const legendNote = legend.me?.holder
    ? { text: '지금 로컬 레전드예요', accent: true }
    : legend.me
      ? { text: `나는 ${formatCount(legend.me.finishCount)}번 · ${formatCount(legend.me.needed)}번 더 완주하면 레전드`, accent: false }
      : legend.holder
        ? null
        : { text: `${legend.periodDays}일 안 ${legend.minFinishes}번 이상 완주하면 레전드가 돼요`, accent: false };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.surface }]}>
      <TitleRow
        kind="crown"
        caption={`최근 ${crown.periodDays}일 최고 기록`}
        holder={crown.holder}
        value={crown.timeSec != null ? formatDuration(crown.timeSec) : null}
        note={crownNote}
      />
      <AppDivider />
      <TitleRow
        kind="legend"
        caption={`최근 ${legend.periodDays}일 최다 완주`}
        holder={legend.holder}
        value={legend.finishCount != null ? `${formatCount(legend.finishCount)}번` : null}
        note={legendNote}
      />
    </View>
  );
}

function TitleRow({
  kind,
  caption,
  holder,
  value,
  note,
}: {
  kind: CourseTitleKind;
  caption: string;
  holder: TitleHolder | null;
  value: string | null;
  note: { text: string; accent: boolean } | null;
}) {
  const who = holder ? `${holder.name}${holder.relation === 'self' ? ' (나)' : holder.relation === 'friend' ? ' · 친구' : ''}` : '아직 없어요';
  const a11y = [COURSE_TITLE_LABEL[kind], caption, who, value, note?.text].filter(Boolean).join(', ');
  return (
    <View style={styles.row} accessible accessibilityLabel={a11y}>
      <CourseTitleBadge kind={kind} size={20} />
      <View style={styles.body}>
        <View style={styles.head}>
          <AppText role="label" style={styles.bold}>
            {COURSE_TITLE_LABEL[kind]}
          </AppText>
          <AppText role="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
            {caption}
          </AppText>
        </View>
        <View style={styles.head}>
          <AppText role="body" tone={holder ? 'primary' : 'secondary'} numberOfLines={1} style={[styles.flex, holder && styles.bold]}>
            {who}
          </AppText>
          {value ? (
            <AppText role="sectionTitle" tabular style={styles.value}>
              {value}
            </AppText>
          ) : null}
        </View>
        {note ? (
          <AppText role="caption" tone={note.accent ? 'accent' : 'secondary'} tabular style={note.accent && styles.bold}>
            {note.text}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  value: {
    fontFamily: fontFamily.extrabold,
  },
});
