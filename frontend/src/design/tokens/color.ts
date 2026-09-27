// ROUTE SIGNAL v0 후보값 (DESIGN-SYSTEM.md 88장). production lock 아님.
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

  signal: '#00BFA6',
  signalPressed: '#009F8B',

  success: '#1B9A59',
  warning: '#D99500',
  danger: '#D84A4A',

  routeCourse: '#00BFA6',
  routeActual: '#FFFFFF',
  routeTarget: '#86E7D8',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ColorRoles = {
  bg: { canvas: string; surface: string; elevated: string };
  text: { primary: string; secondary: string; inverse: string };
  action: { primary: string; primaryPressed: string; onPrimary: string; secondary: string };
  status: { success: string; warning: string; danger: string };
  gps: { good: string; fair: string; poor: string };
  ranking: { up: string; down: string };
  route: { course: string; actual: string; target: string };
  border: { subtle: string };
};

// hex 뒤 두 자리는 alpha. divider/skeleton용 약한 경계선.
const SUBTLE_ALPHA = '33';

const shared = {
  action: {
    primary: palette.signal,
    primaryPressed: palette.signalPressed,
    onPrimary: palette.canvasDark,
  },
  status: { success: palette.success, warning: palette.warning, danger: palette.danger },
  gps: { good: palette.success, fair: palette.warning, poor: palette.danger },
  ranking: { up: palette.success, down: palette.danger },
  route: { course: palette.routeCourse, actual: palette.routeActual, target: palette.routeTarget },
};

export const colorRoles: Record<ColorScheme, ColorRoles> = {
  light: {
    bg: { canvas: palette.canvasLight, surface: palette.surfaceLight, elevated: palette.surfaceLight },
    text: {
      primary: palette.textPrimaryLight,
      secondary: palette.textSecondaryLight,
      inverse: palette.textPrimaryDark,
    },
    action: { ...shared.action, secondary: palette.textPrimaryLight },
    status: shared.status,
    gps: shared.gps,
    ranking: shared.ranking,
    route: shared.route,
    border: { subtle: palette.textSecondaryLight + SUBTLE_ALPHA },
  },
  dark: {
    bg: { canvas: palette.canvasDark, surface: palette.surfaceDark, elevated: palette.surfaceDark },
    text: {
      primary: palette.textPrimaryDark,
      secondary: palette.textSecondaryDark,
      inverse: palette.textPrimaryLight,
    },
    action: { ...shared.action, secondary: palette.textPrimaryDark },
    status: shared.status,
    gps: shared.gps,
    ranking: shared.ranking,
    route: shared.route,
    border: { subtle: palette.textSecondaryDark + SUBTLE_ALPHA },
  },
};
