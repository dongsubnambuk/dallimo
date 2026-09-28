// DESIGN-SYSTEM.md 88.2장: radius는 control/card/sheet 3단계로 제한, 114장: control/card/sheet/pill.
// 값은 v0.3 후보값이다. 레퍼런스(플랜핏 회색 블록 16, 토스·캐시워크 bottom sheet 24, NRC 알약 버튼)와 맞췄다.
export const radius = {
  control: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

// 88.2장: elevation은 bottom sheet와 map overlay에만 분명히 쓴다.
export const elevation = {
  sheet: '0 -6px 24px rgba(0, 0, 0, 0.08)',
  mapOverlay: '0 3px 14px rgba(0, 0, 0, 0.10)',
} as const;

// 88.2장: route line, progress rail, 선택/본인 표시를 같은 'signal line' 두께로 연결한다. v0.3 후보값.
export const stroke = {
  signal: 4,
  control: 1.5,
} as const;
