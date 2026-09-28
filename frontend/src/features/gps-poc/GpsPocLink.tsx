import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives';
import { spacing } from '@/design/tokens';

import { GPS_POC_ENABLED } from './pocFlag';

// 마이 탭 맨 아래 GPS PoC 기록 입구. 개발 빌드 · PoC 테스트 빌드에서만 보인다.
export function GpsPocLink() {
  if (!GPS_POC_ENABLED) return null;
  return (
    <View style={styles.root}>
      <Link href="/gps-poc">
        <AppText role="label" tone="accent">
          GPS PoC 기록 보기 · 내보내기
        </AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.xxl,
  },
});
