import type { GeoPoint } from '@/components/CourseMapPreview';

// Playground 미리보기용 예시 경로. 실제 코스 데이터가 아니며 모양만 흉내 낸다.
// 매번 같은 모양이 나오도록 난수 대신 sin 기반 흔들림을 쓴다.

function loop(center: GeoPoint, rxM: number, ryM: number, n: number, wobble: number, phase = 0): GeoPoint[] {
  const mPerLat = 111_320;
  const mPerLng = mPerLat * Math.cos((center.latitude * Math.PI) / 180);
  const pts: GeoPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 + phase;
    const w = 1 + wobble * Math.sin(3 * t) + wobble * 0.6 * Math.cos(5 * t + 1);
    pts.push({
      latitude: center.latitude + (Math.sin(t) * ryM * w) / mPerLat,
      longitude: center.longitude + (Math.cos(t) * rxM * w) / mPerLng,
    });
  }
  return pts;
}

function path(start: GeoPoint, legs: [number, number][]): GeoPoint[] {
  // legs: [동쪽 m, 북쪽 m]
  const mPerLat = 111_320;
  const mPerLng = mPerLat * Math.cos((start.latitude * Math.PI) / 180);
  const pts = [start];
  let cur = start;
  for (const [e, n] of legs) {
    cur = { latitude: cur.latitude + n / mPerLat, longitude: cur.longitude + e / mPerLng };
    pts.push(cur);
  }
  return pts;
}

/** 수성못 둘레 한 바퀴 (약 2.3km 루프) */
export const suseongmotLoop = loop({ latitude: 35.8286, longitude: 128.6176 }, 420, 300, 48, 0.08);

/** 한강 야간 5K (강변 따라 갔다가 돌아오는 코스) */
export const hangangNight = path({ latitude: 37.5283, longitude: 126.9335 }, [
  [300, 40], [300, 70], [280, 90], [260, 60], [240, -10], [200, -60], [120, -80], [-60, -60], [-200, -30], [-320, 20], [-380, 40], [-420, 10],
]);

/** 대구스타디움 루프 */
export const stadiumLoop = loop({ latitude: 35.8297, longitude: 128.6895 }, 380, 380, 36, 0.04, 0.6);

/** 탐색 화면 주변 코스 (흐리게) */
export const nearbyOthers = [
  loop({ latitude: 35.8262, longitude: 128.6128 }, 200, 140, 24, 0.1, 1),
  path({ latitude: 35.8318, longitude: 128.6205 }, [[180, 60], [150, 120], [90, 180], [-40, 140]]),
];

/** 실제 달린 경로: 코스를 조금 벗어난 구간이 있다 */
export const suseongmotActual: GeoPoint[] = suseongmotLoop.map((p, i) => {
  const detour = i > 18 && i < 25 ? Math.sin(((i - 18) / 6) * Math.PI) * 0.00045 : 0;
  return {
    latitude: p.latitude + 0.00004 * Math.sin(i * 1.7) + detour,
    longitude: p.longitude + 0.00004 * Math.cos(i * 1.3),
  };
});
