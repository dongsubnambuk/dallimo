// ROUTE SIGNAL v0.3 후보값 (민트 네온 + 흑백). production lock 아님.
// 83장 Aqua/teal 계열 signal 안에서 레퍼런스(플랜핏 민트, NRC 흑백 대비)를 따라 다시 정했다 (FOUNDATION-DECISION-LOG.md 8항).
// 화면과 컴포넌트는 palette를 직접 쓰지 않고 semantic role(ColorRoles)만 사용한다.
export const palette = {
  white: '#FFFFFF',
  grayFill: '#F3F4F2',
  ink: '#0B0B0C',
  inkSurface: '#1B1C1E',
  inkElevated: '#242528',

  textSecondaryLight: '#666A68',
  textPrimaryDark: '#F4F5F4',
  textSecondaryDark: '#9A9E9C',

  // signal: 채움 전용 형광 민트. 흰 배경 위 글자로는 쓰지 않는다 (대비 1.47).
  signal: '#2BF0C0',
  signalPressed: '#1FD4A8',
  // 흰 배경 위 강조 글자용 민트 잉크 (대비 5.3)
  signalInk: '#007A62',
  // 밝은 지도에서 형광 민트 선을 받쳐 주는 짙은 민트 테두리
  signalDeep: '#0A6E5A',

  successLight: '#137F48',
  warningLight: '#9A6500',
  dangerLight: '#C93D3D',
  successDark: '#2DBA72',
  warningDark: '#D99500',
  dangerDark: '#F06262',

  // placeholder 지도 바탕 (지도 SDK 전까지). 국내 지도 앱처럼 연회색 땅 + 회색 테두리 흰 길 + 채도 낮은 물·공원.
  mapLandLight: '#F1F1EE',
  mapWaterLight: '#B8D8EE',
  mapParkLight: '#D3E9C8',
  mapRoadLight: '#FFFFFF',
  mapRoadMajorLight: '#FFFFFF',
  mapRoadCasingLight: '#DCDDD7',
  mapPathLight: '#A9B8A2',
  mapLandDark: '#17181A',
  mapWaterDark: '#10222B',
  mapParkDark: '#14241B',
  mapRoadDark: '#26282B',
  mapRoadMajorDark: '#33363B',
  mapRoadCasingDark: '#101113',
  mapPathDark: '#3A4A3E',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ColorRoles = {
  // canvas: 화면 바탕, surface: 묶음 칸 채움(회색 블록), elevated: 지도 위·bottom sheet
  bg: { canvas: string; surface: string; elevated: string };
  // accent: 강조 글자. light에서는 signal 대신 대비를 통과하는 민트 잉크
  text: { primary: string; secondary: string; inverse: string; accent: string };
  // primary: signal 채움(핵심 action 하나), secondary: 흑/백 채움(보조 action), tint: 선택·본인 연한 배경
  action: {
    primary: string;
    primaryPressed: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    tint: string;
  };
  status: { success: string; warning: string; danger: string };
  gps: { good: string; fair: string; poor: string };
  ranking: { up: string; down: string };
  // casing: 경로 선 바깥 테두리. 밝은 지도에서 민트 선이 묻히지 않게 한다.
  route: { course: string; casing: string; actual: string; target: string };
  border: { subtle: string; strong: string };
  // 지도 SDK 결정 전 placeholder 지도 바탕색. SDK 도입 시 SDK 지도 스타일로 대체한다.
  mapBase: { land: string; water: string; park: string; road: string; roadMajor: string; roadCasing: string; path: string };
};

// hex 뒤 두 자리는 alpha
const alpha = (hex: string, a: string) => hex + a;

export const colorRoles: Record<ColorScheme, ColorRoles> = {
  light: {
    bg: { canvas: palette.white, surface: palette.grayFill, elevated: palette.white },
    text: {
      primary: palette.ink,
      secondary: palette.textSecondaryLight,
      inverse: palette.textPrimaryDark,
      accent: palette.signalInk,
    },
    action: {
      primary: palette.signal,
      primaryPressed: palette.signalPressed,
      onPrimary: palette.ink,
      secondary: palette.ink,
      onSecondary: palette.white,
      tint: alpha(palette.signal, '33'),
    },
    status: { success: palette.successLight, warning: palette.warningLight, danger: palette.dangerLight },
    gps: { good: palette.successLight, fair: palette.warningLight, poor: palette.dangerLight },
    ranking: { up: palette.successLight, down: palette.dangerLight },
    // 밝은 지도: 짙은 민트 테두리 + 형광 민트 선, 실제 이동은 검정, 목표(PB·ghost)는 민트 잉크
    route: { course: palette.signal, casing: palette.signalDeep, actual: palette.ink, target: palette.signalInk },
    border: { subtle: alpha(palette.ink, '14'), strong: alpha(palette.ink, '40') },
    mapBase: {
      land: palette.mapLandLight,
      water: palette.mapWaterLight,
      park: palette.mapParkLight,
      road: palette.mapRoadLight,
      roadMajor: palette.mapRoadMajorLight,
      roadCasing: palette.mapRoadCasingLight,
      path: palette.mapPathLight,
    },
  },
  dark: {
    bg: { canvas: palette.ink, surface: palette.inkSurface, elevated: palette.inkElevated },
    text: {
      primary: palette.textPrimaryDark,
      secondary: palette.textSecondaryDark,
      inverse: palette.ink,
      accent: palette.signal,
    },
    action: {
      primary: palette.signal,
      primaryPressed: palette.signalPressed,
      onPrimary: palette.ink,
      secondary: palette.textPrimaryDark,
      onSecondary: palette.ink,
      tint: alpha(palette.signal, '26'),
    },
    status: { success: palette.successDark, warning: palette.warningDark, danger: palette.dangerDark },
    gps: { good: palette.successDark, fair: palette.warningDark, poor: palette.dangerDark },
    ranking: { up: palette.successDark, down: palette.dangerDark },
    // 어두운 지도: 민트 선, 실제 이동 흰색, 목표는 반투명 민트
    route: { course: palette.signal, casing: palette.signalDeep, actual: palette.white, target: alpha(palette.signal, '99') },
    border: { subtle: alpha(palette.white, '1F'), strong: alpha(palette.white, '52') },
    mapBase: {
      land: palette.mapLandDark,
      water: palette.mapWaterDark,
      park: palette.mapParkDark,
      road: palette.mapRoadDark,
      roadMajor: palette.mapRoadMajorDark,
      roadCasing: palette.mapRoadCasingDark,
      path: palette.mapPathDark,
    },
  },
};
