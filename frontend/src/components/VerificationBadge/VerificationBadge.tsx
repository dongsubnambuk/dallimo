import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import type { ColorRoles } from '@/design/tokens';
import { spacing } from '@/design/tokens';

export type VerificationStatus = 'pending' | 'verified' | 'unverified' | 'rejected';

export type VerificationBadgeProps = {
  status: VerificationStatus;
  style?: StyleProp<ViewStyle>;
};

// 95장: 작고 명확한 status. 결과 headline보다 시각적으로 앞서지 않는다.
const config: Record<VerificationStatus, { icon: IconName; copy: string; color: (c: ColorRoles) => string }> = {
  pending: { icon: 'pending', copy: '기록 검증 중', color: (c) => c.text.secondary },
  verified: { icon: 'verified', copy: '공식 기록 인증됨', color: (c) => c.status.success },
  unverified: { icon: 'unverified', copy: '공식 기록 미인증', color: (c) => c.status.warning },
  rejected: { icon: 'rejected', copy: '공식 기록 인증 거부', color: (c) => c.status.danger },
};

export function VerificationBadge({ status, style }: VerificationBadgeProps) {
  const { colors } = useTheme();
  const item = config[status];

  return (
    <View accessible accessibilityLabel={item.copy} style={[styles.root, style]}>
      <AppIcon name={item.icon} size={14} color={item.color(colors)} />
      <AppText role="caption">{item.copy}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
});
