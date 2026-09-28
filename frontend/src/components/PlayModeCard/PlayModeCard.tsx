import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { darkTheme, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';

export type PlayModeCardState = 'default' | 'selected' | 'locked';

export type PlayModeCardProps = {
  icon: IconName;
  title: string;
  // 한 줄 설명. 예: "내 PB 깨기"
  caption: string;
  state?: PlayModeCardState;
  // locked일 때 열리는 조건. 예: "완주하면 열려요"
  lockedReason?: string;
  // 최근에 고른 모드 (66장 "최근 사용 강조")
  recent?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 67.1장 PlayModeCard (selected / default / locked). 73장: 설명을 읽지 않아도 아이콘·제목·짧은 설명으로 모드를 구분한다.
// 89장: 설정 화면 같은 radio list가 아니라 가로로 나란한 타일. 선택은 검정(dark) 채움 + 민트 아이콘으로, 잠김은 자물쇠 + 열리는 조건으로 표시한다.
export function PlayModeCard({ icon, title, caption, state = 'default', lockedReason, recent = false, onPress, style }: PlayModeCardProps) {
  const { colors } = useTheme();
  const selected = state === 'selected';
  const locked = state === 'locked';
  const dark = darkTheme.colors;
  const bg = selected ? dark.bg.canvas : colors.bg.surface;
  const titleColor = selected ? dark.text.primary : locked ? colors.text.secondary : colors.text.primary;
  const captionColor = selected ? dark.text.secondary : colors.text.secondary;
  const iconColor = selected ? dark.action.primary : locked ? colors.text.secondary : colors.text.primary;

  return (
    <AppPressable
      onPress={onPress}
      disabled={locked}
      feedback={locked ? 'none' : 'opacity'}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={[title, caption, locked ? `잠김, ${lockedReason ?? ''}` : null, recent ? '최근 사용' : null].filter(Boolean).join(', ')}
      style={[styles.root, { backgroundColor: bg }, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: selected ? dark.bg.elevated : colors.bg.canvas }]}>
        <AppIcon name={locked ? 'lock' : icon} size={20} color={iconColor} />
      </View>
      <AppText role="label" numberOfLines={1} style={[styles.title, { color: titleColor }]}>
        {title}
      </AppText>
      <AppText role="caption" numberOfLines={2} style={[styles.caption, { color: captionColor }]}>
        {locked ? (lockedReason ?? caption) : caption}
      </AppText>
      {recent && !locked ? (
        <View style={[styles.recent, { backgroundColor: colors.action.primary }]}>
          <AppText role="caption" style={[styles.recentText, { color: colors.action.onPrimary }]}>
            최근
          </AppText>
        </View>
      ) : null}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 112,
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md + spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: fontFamily.extrabold,
  },
  caption: {
    textAlign: 'center',
  },
  recent: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  recentText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 10,
    lineHeight: 15,
  },
});
