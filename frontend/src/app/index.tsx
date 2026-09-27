import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives';
import { spacing } from '@/design/tokens';

// Bootstrap placeholder. 실제 화면은 UI Foundation 승인 후 구현한다.
export default function Index() {
  return (
    <View style={styles.container}>
      <AppText role="screenTitle" accessibilityRole="header">
        달리모
      </AppText>
      <AppText role="label" tone="secondary">
        DALLIMO
      </AppText>
      {__DEV__ ? (
        <Link href="/design-system" style={styles.devLink}>
          <AppText role="label">Design System Playground (개발용)</AppText>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  devLink: {
    marginTop: spacing.xxl,
    padding: spacing.md,
  },
});
