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
  swap: { ios: 'arrow.up.arrow.down', android: 'swap_vert' },
  tabExplore: { ios: 'map', android: 'map' },
  tabRun: { ios: 'figure.run', android: 'directions_run' },
  tabTogether: { ios: 'person.2', android: 'group' },
  tabMy: { ios: 'person.crop.circle', android: 'account_circle' },
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
