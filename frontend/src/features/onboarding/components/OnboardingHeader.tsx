import { StyleSheet, View } from 'react-native';

import { AppPressable, AppText } from '@/design/primitives';
import { spacing, touchTarget } from '@/design/tokens';

// 가입 직후 온보딩 위 줄: 몇 번째 단계인지 + 건너뛰기 (결정 로그 64항)
export function OnboardingHeader({ step, total, onSkip, skipLabel = '건너뛰기' }: { step: number; total: number; onSkip: () => void; skipLabel?: string }) {
  return (
    <View style={styles.root}>
      {/* 한 단계뿐이면(로그인 뒤 권한 안내만) 단계를 보여 주지 않는다 */}
      {total > 1 ? (
        <AppText role="label" tone="secondary" accessibilityLabel={`${total}단계 중 ${step}단계`}>
          {step} / {total}
        </AppText>
      ) : (
        <View />
      )}
      <AppPressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={skipLabel} style={styles.skip}>
        <AppText role="label" tone="secondary">
          {skipLabel}
        </AppText>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
  },
});
