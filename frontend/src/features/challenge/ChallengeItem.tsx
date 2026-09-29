import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { Challenge } from '@/entities/challenge/types';
import { agoLabel } from '@/features/friends/labels';
import { formatDuration } from '@/shared/format';

// 도전 한 줄: 누가 누구 기록에 · 코스 · 결과. 내가 보낸 도전은 내 러닝 결과로, 받은 도전은 그 코스로 간다
export function ChallengeItem({ challenge: c }: { challenge: Challenge }) {
  const { colors } = useTheme();
  const sent = c.role === 'sent';
  const title = sent ? `${c.target.nickname}님 기록에 도전` : `${c.challenger.nickname}님이 내 기록에 도전`;
  const { label, icon, tone } = verdict(c);
  const detail = [c.course.name, `목표 ${formatDuration(c.targetSec)}`, c.resultSec != null ? `기록 ${formatDuration(c.resultSec)}` : null, agoLabel(c.finishedAt ?? c.createdAt)]
    .filter(Boolean)
    .join(' · ');
  const open = () =>
    sent && c.runResultId
      ? router.push({ pathname: '/my/runs/[id]', params: { id: c.runResultId } })
      : router.push({ pathname: '/course/[id]', params: { id: c.course.id } });

  return (
    <AppPressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${label}, ${detail}`}
      accessibilityHint={sent && c.runResultId ? '내 러닝 결과를 열어요' : '코스 상세를 열어요'}
      style={[styles.row, { backgroundColor: colors.bg.surface }]}
    >
      <AppIcon name={icon} size={20} color={tone === 'accent' ? colors.text.accent : colors.text.secondary} />
      <View style={styles.flex}>
        <AppText role="body" numberOfLines={1} style={styles.bold}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary" numberOfLines={1} tabular>
          {detail}
        </AppText>
      </View>
      <AppText role="label" tone={tone} style={styles.bold}>
        {label}
      </AppText>
    </AppPressable>
  );
}

// 받은 도전은 내 기록을 지켰는지로 말한다
function verdict(c: Challenge): { label: string; icon: IconName; tone: 'accent' | 'secondary' | 'primary' } {
  const sent = c.role === 'sent';
  if (c.status === 'success') return sent ? { label: '성공', icon: 'trophy', tone: 'accent' } : { label: '기록 넘김', icon: 'rankDown', tone: 'primary' };
  if (c.status === 'failed') return sent ? { label: '실패', icon: 'modeRival', tone: 'secondary' } : { label: '기록 지킴', icon: 'trophy', tone: 'accent' };
  return { label: '판정 중', icon: 'pending', tone: 'secondary' };
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.min + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
