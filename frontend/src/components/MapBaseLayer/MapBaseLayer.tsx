import { G, Path, Polygon } from 'react-native-svg';

import { useTheme } from '@/design/theme';
import type { GeoPoint } from '@/shared/geo';
import type { MapBase } from '@/shared/map/mockMapBase';

export type MapBaseLayerProps = {
  base: MapBase;
  project: (p: GeoPoint) => [number, number];
};

// 지도 SDK 전 placeholder 지도 바탕 (OpenStreetMap 데이터). 탐색·코스 상세 지도가 함께 쓴다.
// 순서: 공원 → 물 → 보행로(점선) → 골목 → 보조 → 간선. 도로는 회색 테두리 위 흰 선.
// SDK를 도입하면 이 컴포넌트를 SDK 지도 스타일로 대체하고 지운다.
export function MapBaseLayer({ base, project }: MapBaseLayerProps) {
  const { colors } = useTheme();
  const b = colors.mapBase;
  const toPoints = (pts: GeoPoint[]) => pts.map((p) => project(p).join(',')).join(' ');
  // 같은 위계의 선을 하나의 path로 묶어 SVG 요소 수를 줄인다 (8항: 지도 렌더링 부담)
  const toPath = (lines: GeoPoint[][]) =>
    lines
      .map((l) =>
        l
          .map(project)
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
          .join(''),
      )
      .join('');

  return (
    <G>
      {base.parks.map((p, i) => (
        <Polygon key={`pk${i}`} points={toPoints(p)} fill={b.park} />
      ))}
      {base.water.map((w, i) => (
        <Polygon key={`wt${i}`} points={toPoints(w)} fill={b.water} />
      ))}
      <Path d={toPath(base.path)} fill="none" stroke={b.path} strokeWidth={1.2} strokeDasharray="3 3" />
      <Path d={toPath(base.minor)} fill="none" stroke={b.roadCasing} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(base.mid)} fill="none" stroke={b.roadCasing} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(base.major)} fill="none" stroke={b.roadCasing} strokeWidth={8.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(base.minor)} fill="none" stroke={b.road} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(base.mid)} fill="none" stroke={b.road} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(base.major)} fill="none" stroke={b.roadMajor} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}
