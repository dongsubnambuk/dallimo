import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { EMPTY_VALUE } from '@/shared/format';

export type MetricStatus = 'default' | 'emphasized' | 'warning' | 'unavailable';

export type MetricBlockProps = {
  label: string;
  // 표시 형식으로 바꾼 값. 계산 전이면 status="unavailable".
  value: string;
  unit?: string;
  status?: MetricStatus;
  size?: 'hero' | 'large' | 'medium';
  // bottom: 92장 Active Run 배치(값 아래 라벨). top: 요약 행(라벨 위, 국내 앱 결과 화면 패턴).
  labelPosition?: 'top' | 'bottom';
  align?: 'start' | 'center';
  style?: StyleProp<ViewStyle>;
};

// 113장: value > label > unit. 95장: 숫자가 label보다 2~3단계 크게, active run에서는 surface 없이 배치.
// emphasized는 값을 signal 색으로 표시한다 (light는 대비 4.99의 signal ink).
export function MetricBlock({
  label,
  value,
  unit,
  status = 'default',
  size = 'large',
  align = 'start',
  labelPosition = 'bottom',
  style,
}: MetricBlockProps) {
  const { colors } = useTheme();
  const unavailable = status === 'unavailable';
  const shown = unavailable ? EMPTY_VALUE : value;
  const alignItems = align === 'center' ? 'center' : 'flex-start';

  const a11yParts = [label, unavailable ? '측정 전' : `${shown}${unit ? ` ${unit}` : ''}`];
  if (status === 'warning') a11yParts.unshift('주의');

  const valueRole = size === 'hero' ? 'metricHero' : size === 'large' ? 'metricLarge' : 'screenTitle';

  const labelRow = (
    <View style={styles.labelRow}>
      {status === 'warning' ? <AppIcon name="warning" size={14} color={colors.status.warning} /> : null}
      <AppText role="label" tone="secondary">
        {label}
      </AppText>
    </View>
  );

  return (
    <View accessible accessibilityLabel={a11yParts.join(', ')} style={[styles.root, { alignItems }, style]}>
      {labelPosition === 'top' ? labelRow : null}
      <View style={[styles.valueRow, { justifyContent: align === 'center' ? 'center' : 'flex-start' }]}>
        {/* 98장: 긴 값과 큰 글자 설정에서도 한 줄 안에 들어오게 줄인다 (native 전용 동작) */}
        <AppText
          role={valueRole}
          tone={unavailable ? 'secondary' : status === 'emphasized' ? 'accent' : 'primary'}
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
      {labelPosition === 'bottom' ? labelRow : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
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
