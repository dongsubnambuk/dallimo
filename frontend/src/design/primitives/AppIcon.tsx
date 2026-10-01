import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '../theme';

// 아이콘 라이브러리는 expo-symbols 하나만 쓴다 (112장: 여러 icon library 혼용 금지).
// iOS는 SF Symbols, Android/web은 Material Symbols. 화면은 아래 semantic 이름만 쓴다.
const icons = {
  gpsAcquiring: { ios: 'location', android: 'gps_not_fixed' },
  gpsGood: { ios: 'location.fill', android: 'gps_fixed' },
  gpsFair: { ios: 'location.fill', android: 'gps_fixed' },
  gpsPoor: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  gpsUnavailable: { ios: 'location.slash', android: 'location_disabled' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified' },
  pending: { ios: 'clock', android: 'schedule' },
  unverified: { ios: 'questionmark.circle', android: 'help' },
  rejected: { ios: 'xmark.octagon.fill', android: 'block' },
  ahead: { ios: 'arrow.up', android: 'arrow_upward' },
  behind: { ios: 'arrow.down', android: 'arrow_downward' },
  tied: { ios: 'equal', android: 'drag_handle' },
  noData: { ios: 'minus', android: 'remove' },
  rankUp: { ios: 'arrowtriangle.up.fill', android: 'arrow_drop_up' },
  rankDown: { ios: 'arrowtriangle.down.fill', android: 'arrow_drop_down' },
  invited: { ios: 'envelope', android: 'mail' },
  ready: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  running: { ios: 'figure.run', android: 'directions_run' },
  disconnected: { ios: 'wifi.slash', android: 'wifi_off' },
  finished: { ios: 'flag.checkered', android: 'sports_score' },
  dnf: { ios: 'xmark.circle', android: 'cancel' },
  start: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  stop: { ios: 'stop.fill', android: 'stop' },
  map: { ios: 'map', android: 'map' },
  metrics: { ios: 'speedometer', android: 'speed' },
  offline: { ios: 'wifi.slash', android: 'cloud_off' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  check: { ios: 'checkmark', android: 'check' },
  expand: { ios: 'chevron.down', android: 'expand_more' },
  collapse: { ios: 'chevron.right', android: 'chevron_right' },
  search: { ios: 'magnifyingglass', android: 'search' },
  close: { ios: 'xmark', android: 'close' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border' },
  bookmarked: { ios: 'bookmark.fill', android: 'bookmark' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  signals: { ios: 'light.beacon.max', android: 'traffic' },
  nightLight: { ios: 'lightbulb', android: 'lightbulb' },
  crowd: { ios: 'person.3', android: 'groups' },
  surface: { ios: 'road.lanes', android: 'add_road' },
  toilet: { ios: 'toilet', android: 'wc' },
  water: { ios: 'drop', android: 'water_drop' },
  elevation: { ios: 'mountain.2', android: 'terrain' },
  time: { ios: 'clock', android: 'schedule' },
  trophy: { ios: 'trophy', android: 'emoji_events' },
  // REV-001 평점 (빈 별은 같은 모양을 흐린 색으로)
  star: { ios: 'star.fill', android: 'star' },
  // CREG-005 코스 신고
  report: { ios: 'flag', android: 'flag' },
  modeCourse: { ios: 'flag.checkered', android: 'sports_score' },
  modePB: { ios: 'stopwatch', android: 'timer' },
  modeRival: { ios: 'bolt.fill', android: 'bolt' },
  modeTogether: { ios: 'person.2.fill', android: 'group' },
  lock: { ios: 'lock.fill', android: 'lock' },
  swap: { ios: 'arrow.up.arrow.down', android: 'swap_vert' },
  tabExplore: { ios: 'map', android: 'map' },
  tabRun: { ios: 'figure.run', android: 'directions_run' },
  tabTogether: { ios: 'person.2', android: 'group' },
  tabMy: { ios: 'person.crop.circle', android: 'account_circle' },
  settings: { ios: 'gearshape', android: 'settings' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  document: { ios: 'doc.text', android: 'description' },
  external: { ios: 'arrow.up.right', android: 'open_in_new' },
  // 인터벌 달리기 (123장): 진입점 · 편집 (구간 추가 · 순서 바꾸기 · 지우기 · 복제 · 고치기) · 다음 구간
  modeInterval: { ios: 'repeat', android: 'repeat' },
  add: { ios: 'plus', android: 'add' },
  moveUp: { ios: 'chevron.up', android: 'keyboard_arrow_up' },
  moveDown: { ios: 'chevron.down', android: 'keyboard_arrow_down' },
  remove: { ios: 'trash', android: 'delete' },
  duplicate: { ios: 'doc.on.doc', android: 'content_copy' },
  edit: { ios: 'pencil', android: 'edit' },
  skipNext: { ios: 'forward.end.fill', android: 'skip_next' },
  // 외부 기록 가져오기 (122장): 가져오기 · 워치 · 건강 앱
  imported: { ios: 'square.and.arrow.down', android: 'download' },
  watch: { ios: 'applewatch', android: 'watch' },
  health: { ios: 'heart.fill', android: 'favorite' },
  // 온보딩 권한 안내: 알림 (결정 로그 64항)
  notification: { ios: 'bell.fill', android: 'notifications' },
  // 124장 코스 타이틀: 크라운(최근 최고 기록) · 로컬 레전드(최근 최다 완주)
  crown: { ios: 'crown.fill', android: 'crown' },
  legend: { ios: 'flame.fill', android: 'local_fire_department' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof icons;

export type AppIconProps = {
  name: IconName;
  size?: number;
  // theme의 semantic color 값만 넘긴다. 기본값은 text.primary.
  color?: ColorValue;
  // 있으면 스크린 리더가 읽는 이미지, 없으면 옆 텍스트를 보조하는 장식 아이콘으로 숨긴다.
  accessibilityLabel?: string;
};

export function AppIcon({ name, size = 20, color, accessibilityLabel }: AppIconProps) {
  const { colors } = useTheme();
  const symbol = icons[name];

  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={color ?? colors.text.primary}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
