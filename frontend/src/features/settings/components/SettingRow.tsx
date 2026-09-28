import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

// 설정 한 줄. 켜고 끄는 값은 Switch, 이동하는 줄은 오른쪽 화살표, 바깥(휴대폰 설정)으로 나가면 바깥 화살표.
type Props = {
  label: string;
  caption?: string;
  tone?: 'primary' | 'danger';
} & (
  | { kind: 'toggle'; value: boolean; onChange: (v: boolean) => void }
  | { kind: 'link'; value?: string; external?: boolean; onPress: () => void }
  | { kind: 'value'; value: string; trailing?: ReactNode }
);

export function SettingRow(props: Props) {
  const { colors } = useTheme();
  const labelColor = props.tone === 'danger' ? colors.status.danger : colors.text.primary;
  const text = (
    <View style={styles.text}>
      <AppText role="body" style={[styles.label, { color: labelColor }]}>
        {props.label}
      </AppText>
      {props.caption ? (
        <AppText role="caption" tone="secondary">
          {props.caption}
        </AppText>
      ) : null}
    </View>
  );

  if (props.kind === 'toggle') {
    return (
      <View style={styles.row}>
        {text}
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          accessibilityLabel={props.label}
          accessibilityHint={props.caption}
          trackColor={{ false: colors.border.subtle, true: colors.action.primary }}
          thumbColor={colors.bg.elevated}
          {...{ activeThumbColor: colors.bg.elevated }}
          ios_backgroundColor={colors.border.subtle}
        />
      </View>
    );
  }
  if (props.kind === 'link') {
    const icon: IconName = props.external ? 'external' : 'collapse';
    return (
      <AppPressable onPress={props.onPress} accessibilityRole="button" accessibilityLabel={[props.label, props.value, props.caption].filter(Boolean).join(', ')} style={styles.row}>
        {text}
        {props.value ? (
          <AppText role="label" tone="secondary">
            {props.value}
          </AppText>
        ) : null}
        <AppIcon name={icon} size={18} color={colors.text.secondary} />
      </AppPressable>
    );
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={`${props.label}, ${props.value}`}>
      {text}
      <AppText role="label" tone="secondary" tabular selectable>
        {props.value}
      </AppText>
      {props.trailing}
    </View>
  );
}

export function SettingSection({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <AppText role="label" tone="secondary" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={[styles.card, { backgroundColor: colors.bg.surface }]}>{children}</View>
      {footer ? (
        <AppText role="caption" tone="secondary" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fontFamily.medium,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: spacing.xs,
  },
});
