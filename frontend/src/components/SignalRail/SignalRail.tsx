import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, stroke } from '@/design/tokens';

export type SignalRailProps = {
  // 0~1 진행률
  progress: number;
  // 진행 지점에 점(head)을 표시한다. 94장 Together Live "━━━━●" 형태.
  showHead?: boolean;
  // 진행 색. 기본은 signal(action.primary).
  tone?: 'signal' | 'muted';
  style?: StyleProp<ViewStyle>;
};

const HEAD = 10;

// 88.2장: route line, progress rail, ranking movement line을 같은 'signal line' 언어로 연결한다.
// 진행률 표시에 쓰는 공통 선. 장식이 아니라 진행 상태를 보여줄 때만 쓴다.
export function SignalRail({ progress, showHead = false, tone = 'signal', style }: SignalRailProps) {
  const { colors } = useTheme();
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  const fill = tone === 'signal' ? colors.action.primary : colors.text.secondary;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, style]}
    >
      <View style={[styles.track, { backgroundColor: colors.border.subtle }]} />
      <View style={[styles.track, styles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
      {showHead ? (
        <View
          style={[
            styles.head,
            { left: `${pct}%`, backgroundColor: fill, borderColor: colors.bg.canvas },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: HEAD,
    justifyContent: 'center',
  },
  track: {
    height: stroke.signal,
    borderRadius: radius.pill,
  },
  fill: {
    position: 'absolute',
    left: 0,
  },
  head: {
    position: 'absolute',
    width: HEAD,
    height: HEAD,
    marginLeft: -HEAD / 2,
    borderRadius: HEAD / 2,
    borderWidth: 2,
  },
});
