import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';

export type RunAvailability = 'ready' | 'disabledGPS' | 'disabledPermission';

export type PrimaryRunButtonProps = {
  label: string;
  availability?: RunAvailability;
  loading?: boolean;
  // 시작할 수 없는 이유. 없으면 availability별 기본 문구를 쓴다.
  reason?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 73장 Run Ready: 준비되지 않으면 이유를 설명한다.
const defaultReason: Record<Exclude<RunAvailability, 'ready'>, string> = {
  disabledGPS: 'GPS 신호가 약해 아직 시작할 수 없어요',
  disabledPermission: '위치 권한을 허용해야 시작할 수 있어요',
};

// 95장: signal accent를 가장 강하게 쓰는 핵심 action. 한 화면에 하나만 둔다.
export function PrimaryRunButton({
  label,
  availability = 'ready',
  loading = false,
  reason,
  onPress,
  style,
}: PrimaryRunButtonProps) {
  const { colors } = useTheme();
  const ready = availability === 'ready';
  const blockedReason = ready ? null : (reason ?? defaultReason[availability]);

  return (
    <View style={[styles.root, style]}>
      <AppPressable
        onPress={onPress}
        disabled={!ready || loading}
        accessibilityLabel={label}
        accessibilityHint={blockedReason ?? undefined}
        accessibilityState={{ busy: loading }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: ready
              ? pressed
                ? colors.action.primaryPressed
                : colors.action.primary
              : colors.border.subtle,
          },
        ]}
        feedback="none"
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={colors.action.onPrimary} />
          ) : (
            <AppIcon name="start" size={20} color={ready ? colors.action.onPrimary : colors.text.secondary} />
          )}
          <AppText
            role="sectionTitle"
            style={{ color: ready ? colors.action.onPrimary : colors.text.secondary }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </AppText>
        </View>
      </AppPressable>
      {blockedReason ? (
        <View style={styles.reason}>
          <AppIcon name="warning" size={14} color={colors.status.warning} />
          <AppText role="caption" tone="secondary" style={styles.reasonText}>
            {blockedReason}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  button: {
    minHeight: touchTarget.primary,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reasonText: {
    flexShrink: 1,
  },
});
