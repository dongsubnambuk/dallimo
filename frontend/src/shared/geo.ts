// 위경도 좌표와 짧은 거리용 계산. 명세서 10.1장 RunPoint의 latitude/longitude와 같은 단위(도).
export type GeoPoint = { latitude: number; longitude: number };

const M_PER_LAT = 111_320;
const mPerLng = (lat: number) => M_PER_LAT * Math.cos((lat * Math.PI) / 180);

/** 두 점 사이 대략 거리(m). 코스 목록 정렬·표시용이며 기록 계산용이 아니다 (51.1장). */
export function distanceM(a: GeoPoint, b: GeoPoint): number {
  const dx = (b.longitude - a.longitude) * mPerLng((a.latitude + b.latitude) / 2);
  const dy = (b.latitude - a.latitude) * M_PER_LAT;
  return Math.hypot(dx, dy);
}

export type Padding = number | { top: number; right: number; bottom: number; left: number };

/** 여러 점 묶음을 화면 사각형 안에 맞추는 투영. 짧은 거리에서는 경도에 cos(위도)를 곱한 등거리 투영으로 충분하다. */
export function makeProjection(sets: GeoPoint[][], width: number, height: number, padding: Padding = 28) {
  const pad = typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding;
  const all = sets.flat();
  const lats = all.map((p) => p.latitude);
  const lngs = all.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * k, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const innerW = Math.max(width - pad.left - pad.right, 1);
  const innerH = Math.max(height - pad.top - pad.bottom, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const offX = pad.left + (innerW - spanX * scale) / 2;
  const offY = pad.top + (innerH - spanY * scale) / 2;
  return (p: GeoPoint): [number, number] => [offX + (p.longitude - minLng) * k * scale, offY + (maxLat - p.latitude) * scale];
}

function cumulative(pts: GeoPoint[]) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + distanceM(pts[i - 1], pts[i]));
  return d;
}

/** 경로 시작점부터 진행 비율 t(0~1) 위치 */
export function pointAt(pts: GeoPoint[], t: number): GeoPoint {
  const d = cumulative(pts);
  const target = Math.min(1, Math.max(0, t)) * d[d.length - 1];
  const i = Math.max(1, d.findIndex((v) => v >= target));
  const seg = d[i] - d[i - 1] || 1;
  const r = (target - d[i - 1]) / seg;
  return {
    latitude: pts[i - 1].latitude + (pts[i].latitude - pts[i - 1].latitude) * r,
    longitude: pts[i - 1].longitude + (pts[i].longitude - pts[i - 1].longitude) * r,
  };
}

/** 진행 비율 from~to 구간의 점들 */
export function sliceRoute(pts: GeoPoint[], from: number, to: number): GeoPoint[] {
  const d = cumulative(pts);
  const total = d[d.length - 1];
  const inner = pts.filter((_, i) => d[i] / total >= from && d[i] / total <= to);
  return [pointAt(pts, from), ...inner, pointAt(pts, to)];
}

/** 화면 좌표에서 점과 선분 사이 거리(px). 지도 위 경로 탭 판정용. */
export function pointToPolylinePx(p: [number, number], line: [number, number][]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

// ---- 예시 경로 생성 (mock 데이터와 Playground 전용) ----
// 매번 같은 모양이 나오도록 난수 대신 sin 기반 흔들림을 쓴다.

export function loopRoute(center: GeoPoint, rxM: number, ryM: number, n: number, wobble: number, phase = 0): GeoPoint[] {
  const pts: GeoPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 + phase;
    const w = 1 + wobble * Math.sin(3 * t) + wobble * 0.6 * Math.cos(5 * t + 1);
    pts.push({
      latitude: center.latitude + (Math.sin(t) * ryM * w) / M_PER_LAT,
      longitude: center.longitude + (Math.cos(t) * rxM * w) / mPerLng(center.latitude),
    });
  }
  return pts;
}

/** legs: [동쪽 m, 북쪽 m] 이동을 차례로 이은 경로 */
export function legRoute(start: GeoPoint, legs: [number, number][]): GeoPoint[] {
  const pts = [start];
  let cur = start;
  for (const [e, n] of legs) {
    cur = { latitude: cur.latitude + n / M_PER_LAT, longitude: cur.longitude + e / mPerLng(start.latitude) };
    pts.push(cur);
  }
  return pts;
}
