// ROUTE SIGNAL v0.1 후보값. production lock 아님.
// 88장 v0에서 출발했고, 대비 검증 결과에 따라 signal과 status를 light/dark 컨텍스트별로 나눴다 (FOUNDATION-DECISION-LOG.md).
// 화면과 컴포넌트는 palette를 직접 쓰지 않고 semantic role(ColorRoles)만 사용한다.
export const palette = {
  canvasLight: '#F7F8F6',
  surfaceLight: '#FFFFFF',
  canvasDark: '#101312',
  surfaceDark: '#181C1B',

  textPrimaryLight: '#111514',
  textSecondaryLight: '#68716E',
  textPrimaryDark: '#F5F8F7',
  textSecondaryDark: '#A8B1AE',

  // 83장: Aqua/teal 계열 고채도 signal. 어두운 러닝 화면용(bright)과 밝은 탐색 화면용(ink)으로 나눈다.
  signalBright: '#1FE0C4',
  signalBrightPressed: '#17C4AB',
  signalInk: '#00796B',
  signalInkPressed: '#006B5F',

  successLight: '#137F48',
  warningLight: '#9A6500',
  dangerLight: '#C93D3D',
  successDark: '#2DBA72',
  warningDark: '#D99500',
  dangerDark: '#F06262',

  // placeholder 지도 바탕 (지도 SDK 전까지)
  mapLandLight: '#ECEEEC',
  mapWaterLight: '#C9DEE4',
  mapParkLight: '#D9E8D6',
  mapRoadLight: '#FFFFFF',
  mapLandDark: '#1A1F1E',
  mapWaterDark: '#17282E',
  mapParkDark: '#1B2A21',
  mapRoadDark: '#2B3230',

  routeActual: '#FFFFFF',
  routeTarget: '#86E7D8',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ColorRoles = {
  bg: { canvas: string; surface: string; elevated: string };
  text: { primary: string; secondary: string; inverse: string };
  action: { primary: string; primaryPressed: string; onPrimary: string; secondary: string; tint: string };
  status: { success: string; warning: string; danger: string };
  gps: { good: string; fair: string; poor: string };
  ranking: { up: string; down: string };
  route: { course: string; actual: string; target: string };
  border: { subtle: string; strong: string };
  // 지도 SDK 결정 전 placeholder 지도 바탕색. SDK 도입 시 SDK 지도 스타일로 대체한다.
  mapBase: { land: string; water: string; park: string; road: string; roadMajor: string };
};

// hex 뒤 두 자리는 alpha
const alpha = (hex: string, a: string) => hex + a;

export const colorRoles: Record<ColorScheme, ColorRoles> = {
  light: {
    bg: { canvas: palette.canvasLight, surface: palette.surfaceLight, elevated: palette.surfaceLight },
    text: {
      primary: palette.textPrimaryLight,
      secondary: palette.textSecondaryLight,
      inverse: palette.textPrimaryDark,
    },
    action: {
      primary: palette.signalInk,
      primaryPressed: palette.signalInkPressed,
      onPrimary: palette.surfaceLight,
      secondary: palette.textPrimaryLight,
      tint: alpha(palette.signalInk, '14'),
    },
    status: { success: palette.successLight, warning: palette.warningLight, danger: palette.dangerLight },
    gps: { good: palette.successLight, fair: palette.warningLight, poor: palette.dangerLight },
    ranking: { up: palette.successLight, down: palette.dangerLight },
    // 밝은 지도 위: 경로는 signal ink, 실제 이동은 기본 글자색, 목표(PB·ghost)는 반투명 signal
    route: { course: palette.signalInk, actual: palette.textPrimaryLight, target: alpha(palette.signalInk, '66') },
    border: { subtle: alpha(palette.textSecondaryLight, '29'), strong: alpha(palette.textSecondaryLight, '66') },
    mapBase: { land: palette.mapLandLight, water: palette.mapWaterLight, park: palette.mapParkLight, road: palette.mapRoadLight, roadMajor: palette.mapRoadLight },
  },
  dark: {
    bg: { canvas: palette.canvasDark, surface: palette.surfaceDark, elevated: palette.surfaceDark },
    text: {
      primary: palette.textPrimaryDark,
      secondary: palette.textSecondaryDark,
      inverse: palette.textPrimaryLight,
    },
    action: {
      primary: palette.signalBright,
      primaryPressed: palette.signalBrightPressed,
      onPrimary: palette.canvasDark,
      secondary: palette.textPrimaryDark,
      tint: alpha(palette.signalBright, '1A'),
    },
    status: { success: palette.successDark, warning: palette.warningDark, danger: palette.dangerDark },
    gps: { good: palette.successDark, fair: palette.warningDark, poor: palette.dangerDark },
    ranking: { up: palette.successDark, down: palette.dangerDark },
    // 어두운 지도 위: 88장 route 후보 계열 (course는 signal bright, actual 흰색, target 연한 청록)
    route: { course: palette.signalBright, actual: palette.routeActual, target: palette.routeTarget },
    border: { subtle: alpha(palette.textSecondaryDark, '29'), strong: alpha(palette.textSecondaryDark, '66') },
    mapBase: { land: palette.mapLandDark, water: palette.mapWaterDark, park: palette.mapParkDark, road: palette.mapRoadDark, roadMajor: palette.mapRoadDark },
  },
};
