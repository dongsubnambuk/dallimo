import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, spacing } from '@/design/tokens';
import { formatDistanceKm } from '@/shared/format';

export type ElevationProfileProps = {
  profile: { distanceM: number; altitudeM: number }[];
  gainM: number | null;
  height?: number;
};

// 3차 정보: 고도 프로필 (61.1장, 91장 ELEVATION). Komoot처럼 경로와 같은 선 언어로 그린다.
// 높이 차가 작은 평지 코스가 과장돼 보이지 않도록 세로 범위를 최소 30m로 잡는다.
const MIN_RANGE_M = 30;

export function ElevationProfile({ profile, gainM, height = 112 }: ElevationProfileProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const alts = profile.map((p) => p.altitudeM);
  const min = Math.min(...alts);
  const max = Math.max(...alts);
  const total = profile[profile.length - 1]?.distanceM ?? 0;
  const range = Math.max(max - min, MIN_RANGE_M);
  const lo = min - (range - (max - min)) / 2;

  const x = (d: number) => (total > 0 ? (d / total) * width : 0);
  const y = (a: number) => height - ((a - lo) / range) * (height - 8) - 4;
  const line = profile.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.distanceM).toFixed(1)} ${y(p.altitudeM).toFixed(1)}`).join('');
  const area = `${line}L${width} ${height}L0 ${height}Z`;

  const summary = `고도 최저 ${Math.round(min)}미터, 최고 ${Math.round(max)}미터${gainM != null ? `, 오르막 합계 ${gainM}미터` : ''}`;

  return (
    <View style={styles.root} accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={styles.stats}>
        <Stat label="오르막" value={gainM != null ? `+${gainM}` : '--'} unit="m" />
        <Stat label="최고" value={`${Math.round(max)}`} unit="m" />
        <Stat label="최저" value={`${Math.round(min)}`} unit="m" />
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={colors.border.strong} strokeWidth={1} />
            <Path d={area} fill={colors.action.tint} />
            <Path d={line} fill="none" stroke={colors.route.casing} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <AppText role="caption" tone="secondary" tabular>
          0
        </AppText>
        <AppText role="caption" tone="secondary" tabular>
          {formatDistanceKm(total, 1)} km
        </AppText>
      </View>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <AppText role="caption" tone="secondary">
        {label}
      </AppText>
      <View style={styles.statValue}>
        <AppText role="sectionTitle" tabular style={styles.statNumber}>
          {value}
        </AppText>
        <AppText role="caption" tone="secondary">
          {unit}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginBottom: spacing.xs,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statNumber: {
    fontFamily: fontFamily.extrabold,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
