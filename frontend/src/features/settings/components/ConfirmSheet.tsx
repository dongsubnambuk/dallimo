import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

// 되돌릴 수 없는 행동(로그아웃 · 탈퇴) 확인. Together 나가기 확인 sheet와 같은 모양.
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  danger = false,
  busy = false,
  error,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  body: string;
  // 없으면 확인만 하는 안내 sheet
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm?: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.scrim}>
      <AppPressable onPress={busy ? () => undefined : onClose} feedback="none" accessibilityLabel="닫기" style={[StyleSheet.absoluteFill, { backgroundColor: colors.text.primary + '66' }]} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}>
        <AppText role="screenTitle" accessibilityRole="header">
          {title}
        </AppText>
        <AppText role="body" tone="secondary">
          {body}
        </AppText>
        {children}
        {error ? (
          <AppText role="label" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <SecondaryButton label={confirmLabel ? '취소' : '확인'} emphasized={!confirmLabel} disabled={busy} onPress={onClose} style={styles.flex} />
          {confirmLabel ? (
            danger ? (
              <AppPressable
                onPress={onConfirm ?? (() => undefined)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                accessibilityState={{ busy }}
                style={[styles.danger, { backgroundColor: colors.status.danger }]}
              >
                {busy ? <ActivityIndicator color={colors.bg.elevated} /> : null}
                <AppText role="body" style={[styles.bold, { color: colors.bg.elevated }]}>
                  {confirmLabel}
                </AppText>
              </AppPressable>
            ) : (
              <SecondaryButton label={busy ? '처리하는 중' : confirmLabel} emphasized disabled={busy} onPress={onConfirm ?? (() => undefined)} style={styles.flex} />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  danger: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
