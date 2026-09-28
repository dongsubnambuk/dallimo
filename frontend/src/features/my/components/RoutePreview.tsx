import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { makeProjection, type GeoPoint } from '@/shared/geo';

// 히스토리 한 줄의 경로 모양. 지도 없이 선만 그린다. 코스 기록은 코스 색(민트), 자유 기록은 달린 길 색(검정)으로 그려
// 결과 지도와 같은 구분을 따른다 (CLAUDE.md 8항).
export function RoutePreview({ points, course, size = 52 }: { points: GeoPoint[]; course: boolean; size?: number }) {
  const { colors } = useTheme();
  const project = points.length > 1 ? makeProjection([points], size, size, 9) : null;
  const line = project ? points.map((p) => project(p).join(',')).join(' ') : '';
  const start = project ? project(points[0]) : null;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius.control, backgroundColor: colors.mapBase.land, overflow: 'hidden' }}
    >
      {project ? (
        <Svg width={size} height={size}>
          {course ? <Polyline points={line} fill="none" stroke={colors.route.casing} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
          <Polyline points={line} fill="none" stroke={course ? colors.route.course : colors.route.actual} strokeWidth={course ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
          {start ? <Circle cx={start[0]} cy={start[1]} r={3} fill={colors.bg.elevated} stroke={colors.route.casing} strokeWidth={1.5} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
