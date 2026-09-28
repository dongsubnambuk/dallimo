import type { GeoPoint } from '@/shared/geo';

import { MOCK_MAP_DATA } from './mockMapData';

// 지도 SDK 결정 전 placeholder 지도 바탕 (CLAUDE-VISUAL-IMPLEMENTATION-PROMPT: 지도 geometry를 흉내 낸 기능형 placeholder).
// OpenStreetMap 실제 데이터(수성못 일대)를 단순화해 SVG로 그린다. 정적 이미지가 아니라 좌표 데이터다 (97장).
// 지도 SDK를 도입하면 이 파일과 mockMapData.ts를 함께 제거한다.
export type MapBase = {
  water: GeoPoint[][];
  parks: GeoPoint[][];
  // 도로 위계: 간선(trunk·primary·secondary) / 보조(tertiary) / 골목 / 보행로·자전거길
  major: GeoPoint[][];
  mid: GeoPoint[][];
  minor: GeoPoint[][];
  path: GeoPoint[][];
  labels: { text: string; at: GeoPoint; kind: 'water' | 'park' }[];
  // ODbL 출처 표시
  attribution: string;
};

const ORIGIN = { latitude: 35.83, longitude: 128.62 };

function decode(encoded: number[]): GeoPoint[] {
  const out: GeoPoint[] = [];
  let lat = 0;
  let lng = 0;
  for (let i = 0; i + 1 < encoded.length; i += 2) {
    lat += encoded[i];
    lng += encoded[i + 1];
    out.push({ latitude: ORIGIN.latitude + lat / 1e5, longitude: ORIGIN.longitude + lng / 1e5 });
  }
  return out;
}

const all = (list: number[][]) => list.map(decode);

export const MOCK_MAP_BASE: MapBase = {
  water: all(MOCK_MAP_DATA.water),
  parks: all(MOCK_MAP_DATA.parks),
  major: all(MOCK_MAP_DATA.major),
  mid: all(MOCK_MAP_DATA.mid),
  minor: all(MOCK_MAP_DATA.minor),
  path: all(MOCK_MAP_DATA.path),
  labels: [
    { text: '수성못', at: { latitude: 35.8272, longitude: 128.6178 }, kind: 'water' },
    { text: '범어공원', at: { latitude: 35.8445, longitude: 128.6305 }, kind: 'park' },
    { text: '신천', at: { latitude: 35.8375, longitude: 128.6053 }, kind: 'water' },
  ],
  attribution: '© OpenStreetMap',
};
