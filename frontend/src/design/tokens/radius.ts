// DESIGN-SYSTEM.md 88.2장: radius는 control/card/sheet 3단계로 제한, 114장: control/card/sheet/pill.
// 값은 v0 후보값이다. 국내 레퍼런스(Runnect 버튼 10, bottom sheet 20)와 맞췄다.
export const radius = {
  control: 10,
  card: 14,
  sheet: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

// 88.2장: elevation은 bottom sheet와 map overlay에만 분명히 쓴다.
export const elevation = {
  sheet: '0 -4px 16px rgba(0, 0, 0, 0.12)',
  mapOverlay: '0 2px 8px rgba(0, 0, 0, 0.16)',
} as const;

// 88.2장: route line, progress rail, 선택/본인 표시를 같은 'signal line' 두께로 연결한다. v0 후보값.
export const stroke = {
  signal: 3,
  control: 1.5,
} as const;
