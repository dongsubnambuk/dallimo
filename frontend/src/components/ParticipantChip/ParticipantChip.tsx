import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import type { ColorRoles } from '@/design/tokens';
import { radius, spacing, stroke } from '@/design/tokens';

export type ParticipantStatus = 'invited' | 'ready' | 'running' | 'disconnected' | 'finished' | 'dnf';

export type ParticipantChipProps = {
  name: string;
  status: ParticipantStatus;
  // 0~1 진행률. running/finished에서만 표시한다. 실제 위치가 아니라 진행 상태만 보여준다.
  progress?: number;
  style?: StyleProp<ViewStyle>;
};

// 113장: state first. 62장/94장: 상대의 정밀 위치 대신 진행 상태를 공유한다.
const config: Record<ParticipantStatus, { icon: IconName; copy: string; color: (c: ColorRoles) => string }> = {
  invited: { icon: 'invited', copy: '초대됨', color: (c) => c.text.secondary },
  ready: { icon: 'ready', copy: '준비 완료', color: (c) => c.status.success },
  running: { icon: 'running', copy: '달리는 중', color: (c) => c.action.primary },
  disconnected: { icon: 'disconnected', copy: '연결 끊김', color: (c) => c.status.warning },
  finished: { icon: 'finished', copy: '완주', color: (c) => c.status.success },
  dnf: { icon: 'dnf', copy: '중도 포기', color: (c) => c.status.danger },
};

export function ParticipantChip({ name, status, progress, style }: ParticipantChipProps) {
  const { colors } = useTheme();
  const item = config[status];
  const showProgress = progress != null && (status === 'running' || status === 'finished');
  const pct = showProgress ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : null;

  return (
    <View
      accessible
      accessibilityLabel={[item.copy, name, pct != null ? `진행률 ${pct}퍼센트` : null].filter(Boolean).join(', ')}
      style={[styles.root, { borderColor: colors.border.subtle }, style]}
    >
      <View style={styles.row}>
        <AppIcon name={item.icon} size={16} color={item.color(colors)} />
        <AppText role="label" style={styles.status}>
          {item.copy}
        </AppText>
        <AppText role="label" tone="secondary" numberOfLines={1} style={styles.name}>
          {name}
        </AppText>
        {pct != null ? (
          <AppText role="label" tabular>
            {pct}%
          </AppText>
        ) : null}
      </View>
      {pct != null ? (
        <View style={[styles.rail, { backgroundColor: colors.border.subtle }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.action.primary }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  status: {
    flexShrink: 0,
  },
  name: {
    flex: 1,
  },
  rail: {
    height: stroke.signal,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
