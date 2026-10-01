import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { getUserRepository } from '@/entities/user/api';
import { EMPTY_RUNNER, type RunnerProfile } from '@/entities/user/types';
import { AuthFrame } from '@/features/auth/AuthFrame';

import { OnboardingHeader } from './components/OnboardingHeader';
import { RunnerForm } from './components/RunnerForm';

// 가입 직후 1단계: 러너 정보 (사용자 결정, 결정 로그 64항). 추천 코스와 탐색 거리 칩에 쓴다.
// 하나도 고르지 않아도 넘어갈 수 있다. 저장하지 못해도 다음 단계로 갈 수 있고, 설정 > 러너 정보에서 다시 고른다.
export function RunnerInfoScreen() {
  return (
    <AuthFrame>
      <RunnerInfo />
    </AuthFrame>
  );
}

function RunnerInfo() {
  const { colors } = useTheme();
  const repo = useMemo(() => getUserRepository(), []);
  const queryClient = useQueryClient();
  const [value, setValue] = useState<RunnerProfile>(EMPTY_RUNNER);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const picked = value.distance || value.experience || value.preferredTime;

  const next = () => router.replace('/onboarding/permissions');

  const save = async () => {
    if (!picked) return next();
    setPending(true);
    setError(false);
    try {
      await repo.updateRunnerProfile(value);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      next();
    } catch {
      setError(true);
      setPending(false);
    }
  };

  return (
    <>
      <OnboardingHeader step={1} total={2} onSkip={next} />
      <View style={styles.intro}>
        <AppText role="screenTitle" accessibilityRole="header">
          어떻게 달리고 있나요?
        </AppText>
        <AppText role="body" tone="secondary">
          고른 내용에 맞춰 처음 달릴 코스를 골라 드려요. 설정에서 언제든 바꿀 수 있어요.
        </AppText>
      </View>

      <RunnerForm value={value} onChange={setValue} />

      <View style={styles.bottom}>
        {error ? (
          <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
            <AppIcon name="warning" size={18} color={colors.status.warning} />
            <AppText role="label" style={styles.shrink}>
              저장하지 못했어요. 연결을 확인하고 다시 시도하거나 건너뛰어 주세요.
            </AppText>
          </View>
        ) : null}
        <SecondaryButton label={pending ? '저장하는 중' : picked ? '다음' : '고르지 않고 다음'} emphasized disabled={pending} onPress={save} style={styles.cta} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  error: {
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
