import { StyleSheet, View } from 'react-native';

import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';

// 기기에만 있는 기록 (RUN-006 Local First). 기록이 사라진 게 아니라는 것을 먼저 말한다 (73장 Error/Offline).
export function LocalOnlyNotice({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count === 0) return null;
  return (
    <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessible accessibilityLiveRegion="polite">
      <AppIcon name="offline" size={18} color={colors.text.primary} />
      <View style={styles.flexShrink}>
        <AppText role="label" style={styles.bold}>
          휴대폰에만 있는 기록 {count}개
        </AppText>
        <AppText role="caption" tone="secondary">
          인터넷에 연결되면 자동으로 올려요. 기록은 지워지지 않아요.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  flexShrink: {
    flexShrink: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
