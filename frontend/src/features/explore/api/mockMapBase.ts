import { legRoute, loopRoute, type GeoPoint } from '@/shared/geo';

// 지도 SDK 결정 전 placeholder 지도 바탕 (CLAUDE-VISUAL-IMPLEMENTATION-PROMPT: 지도 geometry를 흉내 낸 기능형 placeholder).
// 실제 지도 데이터가 아니다. mock 코스(수성못 주변)와 어울리는 대략적인 물·공원·도로 모양만 그린다.
// 지도 SDK를 도입하면 이 파일과 함께 제거한다.
export type MapBase = {
  water: GeoPoint[][];
  rivers: GeoPoint[][];
  parks: GeoPoint[][];
  majorRoads: GeoPoint[][];
  minorRoads: GeoPoint[][];
  labels: { text: string; at: GeoPoint; kind: 'water' | 'park' }[];
};

const LAKE_CENTER: GeoPoint = { latitude: 35.8286, longitude: 128.6176 };
const PARK_CENTER: GeoPoint = { latitude: 35.8398, longitude: 128.6262 };

function line(a: GeoPoint, b: GeoPoint): GeoPoint[] {
  return [a, b];
}

function grid(): GeoPoint[][] {
  const out: GeoPoint[][] = [];
  for (let lat = 35.8125; lat <= 35.849; lat += 0.0027) out.push(line({ latitude: lat, longitude: 128.594 }, { latitude: lat, longitude: 128.648 }));
  for (let lng = 128.5965; lng <= 128.648; lng += 0.0033) out.push(line({ latitude: 35.811, longitude: lng }, { latitude: 35.85, longitude: lng }));
  return out;
}

export const MOCK_MAP_BASE: MapBase = {
  water: [loopRoute(LAKE_CENTER, 330, 215, 40, 0.07)],
  rivers: [
    legRoute({ latitude: 35.811, longitude: 128.6012 }, [
      [-20, 400], [-40, 450], [-30, 500], [-60, 520], [-50, 480], [-20, 450], [-30, 420], [-40, 380],
    ]),
  ],
  parks: [loopRoute(PARK_CENTER, 360, 410, 30, 0.1, 0.4), loopRoute(LAKE_CENTER, 470, 350, 40, 0.05)],
  majorRoads: [
    line({ latitude: 35.8337, longitude: 128.594 }, { latitude: 35.8337, longitude: 128.702 }),
    line({ latitude: 35.8212, longitude: 128.594 }, { latitude: 35.8212, longitude: 128.702 }),
    line({ latitude: 35.811, longitude: 128.6087 }, { latitude: 35.85, longitude: 128.6087 }),
    line({ latitude: 35.811, longitude: 128.6305 }, { latitude: 35.85, longitude: 128.6305 }),
  ],
  minorRoads: grid(),
  labels: [
    { text: '수성못', at: LAKE_CENTER, kind: 'water' },
    { text: '범어공원', at: PARK_CENTER, kind: 'park' },
    { text: '신천', at: { latitude: 35.8352, longitude: 128.5992 }, kind: 'water' },
  ],
};
