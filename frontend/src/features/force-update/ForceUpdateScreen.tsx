import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

// 강제 업데이트 안내 (결정 로그 79항). 이 화면에서는 다른 곳으로 갈 수 없다. 스토어에서 업데이트한 뒤 앱을 다시 연다
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.body} accessibilityLiveRegion="polite">
        <AppIcon name="warning" size={28} color={colors.status.warning} />
        <AppText role="screenTitle" accessibilityRole="header">
          업데이트가 필요해요
        </AppText>
        <AppText role="body" tone="secondary">
          지금 버전으로는 달리모를 쓸 수 없어요. App Store에서 업데이트한 뒤 다시 열어 주세요.
        </AppText>
      </View>
      {storeUrl ? <SecondaryButton label="App Store에서 업데이트" emphasized onPress={() => Linking.openURL(storeUrl)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
});
