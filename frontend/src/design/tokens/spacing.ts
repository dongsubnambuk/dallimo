// DESIGN-SYSTEM.md 67장 Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export type SpacingToken = keyof typeof spacing;

// 이동 중 조작을 고려한 최소 터치 영역 (ACCESSIBILITY.md 68장). v0 후보값.
export const touchTarget = {
  min: 48,
  // 화면의 핵심 action(PrimaryRunButton) 높이
  primary: 56,
} as const;
