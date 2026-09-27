import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing, stroke } from '@/design/tokens';
import { EMPTY_VALUE } from '@/shared/format';

export type MetricStatus = 'default' | 'emphasized' | 'warning' | 'unavailable';

export type MetricBlockProps = {
  label: string;
  // 표시 형식으로 바꾼 값. 계산 전이면 status="unavailable".
  value: string;
  unit?: string;
  status?: MetricStatus;
  size?: 'hero' | 'large';
  align?: 'start' | 'center';
  style?: StyleProp<ViewStyle>;
};

// 113장: value > label > unit. 95장: 숫자가 label보다 2~3단계 크게, active run에서는 surface 없이 배치.
export function MetricBlock({
  label,
  value,
  unit,
  status = 'default',
  size = 'large',
  align = 'start',
  style,
}: MetricBlockProps) {
  const { colors } = useTheme();
  const unavailable = status === 'unavailable';
  const shown = unavailable ? EMPTY_VALUE : value;
  const alignItems = align === 'center' ? 'center' : 'flex-start';

  const a11yParts = [label, unavailable ? '측정 전' : `${shown}${unit ? ` ${unit}` : ''}`];
  if (status === 'warning') a11yParts.unshift('주의');

  return (
    <View
      accessible
      accessibilityLabel={a11yParts.join(', ')}
      style={[
        styles.root,
        { alignItems },
        status === 'emphasized' && [styles.emphasized, { borderLeftColor: colors.action.primary }],
        style,
      ]}
    >
      <View style={[styles.valueRow, { justifyContent: align === 'center' ? 'center' : 'flex-start' }]}>
        {/* 98장: 긴 값과 큰 글자 설정에서도 한 줄 안에 들어오게 줄인다 (native 전용 동작) */}
        <AppText
          role={size === 'hero' ? 'metricHero' : 'metricLarge'}
          tone={unavailable ? 'secondary' : 'primary'}
          tabular
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.value}
        >
          {shown}
        </AppText>
        {unit && !unavailable ? (
          <AppText role="label" tone="secondary" style={styles.unit}>
            {unit}
          </AppText>
        ) : null}
      </View>
      <View style={styles.labelRow}>
        {status === 'warning' ? <AppIcon name="warning" size={14} color={colors.status.warning} /> : null}
        <AppText role="label" tone="secondary">
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  emphasized: {
    borderLeftWidth: stroke.signal,
    paddingLeft: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.xs,
  },
  value: {
    flexShrink: 1,
  },
  unit: {
    flexShrink: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
