import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

// 아직 구현 순서(72장)가 오지 않은 탭의 자리. 제품 화면이 아니다.
export function PendingScreen({ title, order, showDevLinks }: { title: string; order: string; showDevLinks?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.xl }]}>
      <AppText role="screenTitle" accessibilityRole="header">
        {title}
      </AppText>
      <AppText role="body" tone="secondary">
        {order}에서 구현합니다.
      </AppText>
      {showDevLinks && __DEV__ ? (
        <View style={styles.dev}>
          <AppText role="caption" tone="secondary">
            개발용
          </AppText>
          <Link href="/design-system">
            <AppText role="label" tone="accent">
              Design System Playground
            </AppText>
          </Link>
          {(['loading', 'denied', 'empty', 'error'] as const).map((s) => (
            <Link key={s} href={{ pathname: '/', params: { scenario: s } }}>
              <AppText role="label" tone="accent">
                탐색 화면 · {s}
              </AppText>
            </Link>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dev: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
});
