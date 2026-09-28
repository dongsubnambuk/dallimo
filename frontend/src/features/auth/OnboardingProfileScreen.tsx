import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, spacing, touchTarget } from '@/design/tokens';

import { ProfileForm } from './ProfileForm';
import { completeOnboarding, signOut } from './session';

// SCR-A02 최초 프로필 (AUTH-002): 프로필 이미지, 닉네임, 완료. 끝나면 탐색으로 간다.
export function OnboardingProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Wordmark height={22} />
        <View style={styles.head}>
          <AppText role="screenTitle" accessibilityRole="header">
            달리모에서 쓸 이름을 정해 주세요
          </AppText>
          <AppText role="body" tone="secondary">
            코스 랭킹과 함께 달리기에서 친구들이 이 이름과 사진을 봐요. 나중에 설정에서 바꿀 수 있어요.
          </AppText>
        </View>
        <ProfileForm initial={{ nickname: '', profileImageUrl: null }} submitLabel="시작하기" onDone={() => completeOnboarding()} />
        <AppPressable onPress={() => signOut()} accessibilityRole="button" style={styles.other}>
          <AppText role="label" tone="secondary" style={styles.underline}>
            다른 계정으로 로그인
          </AppText>
        </AppPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  head: {
    gap: spacing.sm,
  },
  other: {
    minHeight: touchTarget.min,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  underline: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
