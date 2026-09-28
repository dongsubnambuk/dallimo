import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

export type StateNoticeProps = {
  icon: IconName;
  tone?: 'neutral' | 'warning' | 'danger';
  title: string;
  body?: string;
  // 다음 행동 버튼들. 빈 상태·오류는 분위기가 아니라 다음 행동을 알려준다.
  actions?: ReactNode;
};

// 로딩 외 상태(권한 거부, 결과 없음, 네트워크 오류, 비공개 코스) 안내. 탐색·코스 상세에서 함께 쓴다.
// 탐색 전용이었다가 코스 상세에서도 쓰여 src/components로 옮겼다 (CLAUDE.md 13항).
export function StateNotice({ icon, tone = 'neutral', title, body, actions }: StateNoticeProps) {
  const { colors } = useTheme();
  const iconColor = tone === 'warning' ? colors.status.warning : tone === 'danger' ? colors.status.danger : colors.text.secondary;

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <AppIcon name={icon} size={20} color={iconColor} />
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      </View>
      {body ? (
        <AppText role="body" tone="secondary">
          {body}
        </AppText>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
