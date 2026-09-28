import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { ProfileForm } from '@/features/auth/ProfileForm';
import { useMe } from '@/features/my/useMy';

// 프로필 수정 (AUTH-002, PATCH /users/me). 처음 가입 때와 같은 입력을 쓴다.
export function ProfileEditScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe('normal');
  const queryClient = useQueryClient();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          프로필 수정
        </AppText>
      </View>
      {me.data ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          <ProfileForm
            initial={me.data.profile}
            submitLabel="저장"
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: ['me'] });
              back();
            }}
          />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <BrandLoader size={40} label="프로필 불러오는 중" />
        </View>
      )}
    </KeyboardAvoidingView>
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
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
