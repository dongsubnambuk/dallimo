import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SignalRail } from '@/components/SignalRail';
import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import type { ColorRoles } from '@/design/tokens';
import { spacing } from '@/design/tokens';

export type ParticipantStatus = 'invited' | 'ready' | 'running' | 'disconnected' | 'finished' | 'dnf';

export type ParticipantChipProps = {
  name: string;
  status: ParticipantStatus;
  // 0~1 진행률. running/finished/disconnected에서 표시한다. 실제 위치가 아니라 진행 상태만 보여준다.
  progress?: number;
  // 진행률 오른쪽에 표시할 값. 예: "+72m"
  trailing?: string;
  style?: StyleProp<ViewStyle>;
};

// 113장: state first. 62장/94장: 상대의 정밀 위치 대신 진행 상태를 signal rail로 공유한다.
const config: Record<ParticipantStatus, { icon: IconName; copy: string; color: (c: ColorRoles) => string }> = {
  invited: { icon: 'invited', copy: '초대됨', color: (c) => c.text.secondary },
  ready: { icon: 'ready', copy: '준비 완료', color: (c) => c.status.success },
  running: { icon: 'running', copy: '달리는 중', color: (c) => c.action.primary },
  disconnected: { icon: 'disconnected', copy: '연결 끊김', color: (c) => c.status.warning },
  finished: { icon: 'finished', copy: '완주', color: (c) => c.status.success },
  dnf: { icon: 'dnf', copy: '중도 포기', color: (c) => c.status.danger },
};

export function ParticipantChip({ name, status, progress, trailing, style }: ParticipantChipProps) {
  const { colors } = useTheme();
  const item = config[status];
  const showProgress = progress != null && (status === 'running' || status === 'finished' || status === 'disconnected');
  const pct = showProgress ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : null;
  const right = trailing ?? (pct != null ? `${pct}%` : null);

  return (
    <View
      accessible
      accessibilityLabel={[item.copy, name, pct != null ? `진행률 ${pct}퍼센트` : null, trailing].filter(Boolean).join(', ')}
      style={[styles.root, style]}
    >
      <View style={styles.row}>
        <AppIcon name={item.icon} size={16} color={item.color(colors)} />
        {/* 레이스 중에는 running이 기본 상태라 아이콘으로만 표시하고 이름을 앞세운다. 다른 상태는 상태 문구가 먼저 온다. */}
        {status === 'running' ? null : (
          <AppText role="label" style={styles.status}>
            {item.copy}
          </AppText>
        )}
        <AppText
          role="label"
          tone={status === 'running' ? 'primary' : 'secondary'}
          numberOfLines={1}
          style={styles.name}
        >
          {name}
        </AppText>
        {right ? (
          <AppText role="label" tabular>
            {right}
          </AppText>
        ) : null}
      </View>
      {pct != null ? (
        <SignalRail progress={pct / 100} showHead={status === 'running'} tone={status === 'disconnected' ? 'muted' : 'signal'} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
});
