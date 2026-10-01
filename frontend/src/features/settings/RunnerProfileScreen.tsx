import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { getUserRepository } from '@/entities/user/api';
import type { RunnerProfile } from '@/entities/user/types';
import { useMe } from '@/features/my/useMy';
import { RunnerForm } from '@/features/onboarding/components/RunnerForm';

// 설정 > 러너 정보 (결정 로그 64항). 온보딩에서 고른 평소 거리 · 경험 · 달리는 시간을 바꾼다.
// 추천 코스와 탐색 거리 칩에 쓴다.
export function RunnerProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe('normal');
  const repo = useMemo(() => getUserRepository(), []);
  const queryClient = useQueryClient();
  // 고치기 전에는 서버 값을 그대로 보여 준다
  const [draft, setDraft] = useState<RunnerProfile | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const original = me.data?.runner;
  const value = draft ?? original ?? null;
  const changed = value != null && original != null && JSON.stringify(value) !== JSON.stringify(original);

  const save = async () => {
    if (!value) return;
    setPending(true);
    setError(false);
    try {
      await repo.updateRunnerProfile(value);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          러너 정보
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
        <AppText role="body" tone="secondary">
          고른 내용에 맞춰 추천 코스와 탐색의 거리 칩을 바꿔요. 고르지 않아도 돼요.
        </AppText>

        {me.isPending ? (
          <AppText role="body" tone="secondary">
            불러오는 중
          </AppText>
        ) : me.isError || !value ? (
          <StateNotice
            icon="offline"
            tone="warning"
            title="러너 정보를 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => me.refetch()} />}
          />
        ) : (
          <>
            <RunnerForm
              value={value}
              onChange={(v) => {
                setDraft(v);
                setSaved(false);
              }}
            />
            {error ? (
              <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
                <AppIcon name="warning" size={18} color={colors.status.warning} />
                <AppText role="label" style={styles.shrink}>
                  저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
                </AppText>
              </View>
            ) : saved ? (
              <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
                <AppIcon name="check" size={18} color={colors.status.success} />
                <AppText role="label" style={styles.shrink}>
                  저장했어요. 다음 추천부터 바뀐 내용을 써요.
                </AppText>
              </View>
            ) : null}
            <SecondaryButton label={pending ? '저장하는 중' : '저장하기'} emphasized disabled={!changed || pending} onPress={save} style={styles.cta} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  shrink: {
    flexShrink: 1,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: touchTarget.primary,
  },
});
