import { distanceM, type GeoPoint } from '@/shared/geo';

// 16장 Privacy Zone: 공유 카드에서 집 · 직장처럼 민감한 출발 · 도착 지점이 보이지 않게 가린다.
// 코스 없는 기록(자유 달리기 · 함께 달리기)만. 코스 기록은 이미 공개된 코스 위라 가리지 않는다.
// 범위는 20.2장 "출시 전 개인정보 검토"에서 정할 값이라 시작값 200m (FOUNDATION-DECISION-LOG 43항).
export const PRIVACY_RADIUS_M = 200;

/**
 * 출발점에서 radius 안의 앞부분, 도착점에서 radius 안의 뒷부분을 뺀다.
 * 남는 경로가 두 점보다 짧으면(짧은 기록 · 제자리 왕복) 빈 경로 — 지도 카드를 만들지 않는다.
 */
export function maskEnds(path: GeoPoint[], radiusM: number = PRIVACY_RADIUS_M): GeoPoint[] {
  if (path.length < 2) return [];
  const start = path[0];
  const end = path[path.length - 1];
  let from = 0;
  while (from < path.length && distanceM(start, path[from]) < radiusM) from++;
  let to = path.length - 1;
  while (to >= from && distanceM(end, path[to]) < radiusM) to--;
  const kept = path.slice(from, to + 1);
  // 출발 · 도착 반경 안으로 다시 들어온 점도 지운다 (한 바퀴 돌아 출발점 근처를 지나는 경우)
  const safe = kept.filter((p) => distanceM(start, p) >= radiusM && distanceM(end, p) >= radiusM);
  return safe.length >= 2 ? safe : [];
}
