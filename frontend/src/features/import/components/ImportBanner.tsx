import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { SOURCE_LABEL } from '@/entities/import/types';

import { newCandidates, useHealthConnection, useImportCandidates } from '../useImport';

// 122.3장 "새 러닝 기록 N개를 발견했어요". 연결했고 가져올 기록이 있을 때만 My에 보인다
export function ImportBanner() {
  const { colors } = useTheme();
  const { provider, connected } = useHealthConnection();
  const candidates = useImportCandidates();
  const { refetch } = candidates;
  useFocusEffect(
    useCallback(() => {
      if (connected) refetch();
    }, [connected, refetch]),
  );
  const n = newCandidates(candidates.data).length;
  if (!connected || n === 0) return null;
  const title = `새 러닝 기록 ${n}개를 발견했어요`;
  const sub = `${SOURCE_LABEL[provider.source]}에서 가져오기`;
  return (
    <AppPressable
      onPress={() => router.push('/import')}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      style={[styles.root, { backgroundColor: colors.bg.surface }]}
    >
      <AppIcon name="imported" size={22} color={colors.text.primary} />
      <View style={styles.flex}>
        <AppText role="body" style={styles.bold}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary">
          {sub}
        </AppText>
      </View>
      <AppIcon name="collapse" size={18} color={colors.text.secondary} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
