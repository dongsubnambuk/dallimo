import { StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { summarizeBlocks, totalLabel } from '@/entities/workout/labels';
import type { WorkoutBlock } from '@/entities/workout/types';

// 인터벌 한 개: 이름 · 구성 한 줄 · 전체 양. 누르면 그 인터벌로 달리기 준비, 오른쪽 버튼은 고치기(내 인터벌) · 고쳐서 저장(추천)
type Props = {
  name: string;
  blocks: WorkoutBlock[];
  caption?: string | null;
  onStart: () => void;
  action?: { label: string; onPress: () => void };
};

export function WorkoutCard({ name, blocks, caption, onStart, action }: Props) {
  const { colors } = useTheme();
  const summary = summarizeBlocks(blocks);
  const total = totalLabel(blocks);
  return (
    <View style={[styles.card, { backgroundColor: colors.bg.surface }]}>
      <AppPressable
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={[name, summary, total, caption].filter(Boolean).join(', ')}
        accessibilityHint="이 인터벌로 달리기 준비를 열어요"
        style={styles.main}
      >
        <View style={[styles.icon, { backgroundColor: colors.action.tint }]}>
          <AppIcon name="modeInterval" size={20} color={colors.text.accent} />
        </View>
        <View style={styles.text}>
          <AppText role="body" style={styles.name} numberOfLines={1}>
            {name}
          </AppText>
          <AppText role="label" tone="secondary" numberOfLines={2}>
            {summary}
          </AppText>
          <AppText role="caption" tone="secondary" tabular numberOfLines={1}>
            {[total, caption].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <AppIcon name="start" size={20} color={colors.text.accent} />
      </AppPressable>
      {action ? (
        <AppPressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={`${name} ${action.label}`} style={[styles.action, { borderTopColor: colors.border.subtle }]}>
          <AppIcon name="edit" size={16} color={colors.text.secondary} />
          <AppText role="label" tone="secondary" style={styles.actionText}>
            {action.label}
          </AppText>
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  main: {
    minHeight: touchTarget.min + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
  },
  action: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontFamily: fontFamily.bold,
  },
});
