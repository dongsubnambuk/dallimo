import { legRoute, loopRoute, type GeoPoint } from '@/shared/geo';

// Playground 미리보기용 예시 경로. 실제 코스 데이터가 아니며 모양만 흉내 낸다.

/** 수성못 둘레 한 바퀴 (약 2.3km 루프) */
export const suseongmotLoop = loopRoute({ latitude: 35.8286, longitude: 128.6176 }, 420, 300, 48, 0.08);

/** 대구스타디움 루프 */
export const stadiumLoop = loopRoute({ latitude: 35.8297, longitude: 128.6895 }, 380, 380, 36, 0.04, 0.6);

/** 탐색 화면 주변 코스 (흐리게) */
export const nearbyOthers = [
  loopRoute({ latitude: 35.8262, longitude: 128.6128 }, 200, 140, 24, 0.1, 1),
  legRoute({ latitude: 35.8318, longitude: 128.6205 }, [[180, 60], [150, 120], [90, 180], [-40, 140]]),
];

/** 실제 달린 경로: 코스를 조금 벗어난 구간이 있다 */
export const suseongmotActual: GeoPoint[] = suseongmotLoop.map((p, i) => {
  const detour = i > 18 && i < 25 ? Math.sin(((i - 18) / 6) * Math.PI) * 0.00045 : 0;
  return {
    latitude: p.latitude + 0.00004 * Math.sin(i * 1.7) + detour,
    longitude: p.longitude + 0.00004 * Math.cos(i * 1.3),
  };
});
