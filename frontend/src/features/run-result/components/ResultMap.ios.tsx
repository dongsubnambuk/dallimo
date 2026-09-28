import { StyleSheet, View } from 'react-native';

import { BrandMap, CourseLine, Dot, PathLine, regionFor } from '@/components/AppleMap';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import type { GeoPoint } from '@/shared/geo';

// iOS 결과 지도 (애플 지도, RST-001, 93장 ROUTE MAP). 기준 코스(짙은 민트 테두리 + 형광 민트)와 실제로 달린 길(검정 선).
// 스크롤 안에 놓인 지도라 제스처를 끈다. 결과 · 러닝 상세 · 코스 등록(경로 확인)이 함께 쓴다.
export function ResultMap({ path, course, height }: { path: GeoPoint[]; course: GeoPoint[] | null; height: number }) {
  const { colors } = useTheme();
  const sets = [...(course && course.length > 1 ? [course] : []), ...(path.length > 1 ? [path] : [])];
  const region = regionFor(sets, 400, 1.4);
  const first = path[0] ?? course?.[0] ?? null;
  const last = path[path.length - 1] ?? null;

  return (
    <View style={[styles.root, { height, backgroundColor: colors.mapBase.land }]}>
      <BrandMap interactive={false} initialRegion={region ?? undefined} accessibilityLabel={course ? '기준 코스와 달린 경로 지도' : '달린 경로 지도'}>
        {course && course.length > 1 ? <CourseLine route={course} emphasis="thin" /> : null}
        <PathLine path={path} overCourse={!!course} />
        {last ? <Dot at={last} size={12} fill={colors.route.actual} ring={colors.bg.elevated} ringWidth={2.5} /> : null}
        {first ? <Dot at={first} size={14} fill={colors.bg.elevated} ring={colors.route.casing} ringWidth={3.5} /> : null}
      </BrandMap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
