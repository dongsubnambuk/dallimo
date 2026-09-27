import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

// SCR-E03 코스 상세 자리. 다음 구현 단계(72장 3번 Course Detail)에서 채운다.
export default function CourseDetailRoute() {
  const { colors } = useTheme();
  const { name } = useLocalSearchParams<{ id: string; name?: string }>();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      <Stack.Screen options={{ title: name ?? '코스' }} />
      <AppText role="screenTitle">{name ?? '코스'}</AppText>
      <AppText role="body" tone="secondary">
        코스 상세 화면은 다음 단계(72장 3번 Course Detail)에서 구현합니다.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
