import type { CourseSummary } from '@/entities/course/types';
import { distanceM, type GeoPoint } from '@/shared/geo';

// 탐색 지도가 보여줄 범위. SVG 지도(웹 · Android)와 애플 지도(iOS)가 같은 기준을 쓴다.

// 선택 코스에서 이 거리 안이면 내 위치도 화면에 함께 맞춘다
const USER_IN_FRAME_M = 1200;
const USER_FOCUS_RADIUS_M = 900;
export const MIN_SPAN_M = 1300;
export const MIN_SPAN_VERTICAL_M = 500;

// 코스 하나만 맞추면 너무 확대돼 주변 길이 안 보인다. 가로로 약 1.3km(세로 0.5km)보다 더 확대하지 않는다.
// 세로는 작은 화면에서 보이는 지도 높이가 짧아 크게 잡지 않는다.
export function withMinSpan(frame: GeoPoint[][], minM: number, minVerticalM: number): GeoPoint[][] {
  const pts = frame.flat();
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const c = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const dLat = minVerticalM / 2 / 111_320;
  const dLng = minM / 2 / 111_320 / Math.cos((c.latitude * Math.PI) / 180);
  return [...frame, [{ latitude: c.latitude - dLat, longitude: c.longitude - dLng }, { latitude: c.latitude + dLat, longitude: c.longitude + dLng }]];
}

function around(c: GeoPoint): GeoPoint[][] {
  const d = USER_FOCUS_RADIUS_M / 111_320;
  return [[{ latitude: c.latitude - d, longitude: c.longitude - d }, { latitude: c.latitude + d, longitude: c.longitude + d }]];
}

export function frameFor(
  focus: 'selection' | 'user',
  selected: CourseSummary | null,
  courses: CourseSummary[],
  user: GeoPoint | null,
  fallback: GeoPoint,
): GeoPoint[][] {
  if (focus === 'user' && user) return around(user);
  if (courses.length === 0) return around(user ?? fallback);
  const frame: GeoPoint[][] = selected ? [selected.displayRoute] : courses.map((c) => c.displayRoute);
  if (user && (!selected || distanceM(user, selected.displayRoute[0]) < USER_IN_FRAME_M)) frame.push([user]);
  return frame;
}

