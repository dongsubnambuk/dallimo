// INTERACTION-SPECS.md 69장 상황별 모션 역할. 지속 시간(ms)은 v0 후보값이다.
// 모션은 상태 변화를 알릴 때만 쓰고, 시스템의 동작 줄이기 설정을 따른다.
export const motion = {
  pressFeedback: 120,
  gapEmphasis: 250,
  rankReorder: 250,
  routeWarning: 250,
  finishReveal: 400,
  countdownStep: 1000,
} as const;

// pressed 상태 피드백 불투명도
export const pressedOpacity = 0.7;
export const disabledOpacity = 0.4;
