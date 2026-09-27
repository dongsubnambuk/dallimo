import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import type { ColorRoles } from '@/design/tokens';
import { elevation, radius, spacing } from '@/design/tokens';

export type GpsQuality = 'acquiring' | 'good' | 'fair' | 'poor' | 'unavailable';

export type GpsStatusProps = {
  quality: GpsQuality;
  // 기본 문구 대신 쓸 문구
  copy?: string;
  // pill: 지도 위에 올릴 때 배경 surface를 둔다 (68장: 지도 위 텍스트는 surface 위에).
  variant?: 'inline' | 'pill';
  style?: StyleProp<ViewStyle>;
};

// 113장: icon + text + semantic color. 68장: 색만으로 상태를 구분하지 않는다.
const config: Record<GpsQuality, { icon: IconName; copy: string; color: (c: ColorRoles) => string }> = {
  acquiring: { icon: 'gpsAcquiring', copy: 'GPS 찾는 중', color: (c) => c.text.secondary },
  good: { icon: 'gpsGood', copy: 'GPS 양호', color: (c) => c.gps.good },
  fair: { icon: 'gpsFair', copy: 'GPS 보통', color: (c) => c.gps.fair },
  poor: { icon: 'gpsPoor', copy: 'GPS 약함', color: (c) => c.gps.poor },
  unavailable: { icon: 'gpsUnavailable', copy: 'GPS 사용 불가', color: (c) => c.text.secondary },
};

export function GpsStatus({ quality, copy, variant = 'inline', style }: GpsStatusProps) {
  const { colors } = useTheme();
  const item = config[quality];
  const text = copy ?? item.copy;

  return (
    <View accessible accessibilityLabel={text} accessibilityLiveRegion="polite" style={[styles.root, variant === 'pill' && [styles.pill, { backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay }], style]}>
      <AppIcon name={item.icon} size={16} color={item.color(colors)} />
      <AppText role="label">{text}</AppText>
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
  pill: {
    paddingVertical: spacing.xs + spacing.xs / 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
});
