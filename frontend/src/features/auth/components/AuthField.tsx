import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

export type FieldStatus = { copy: string; icon: IconName | null; tone: 'ok' | 'warning' | 'neutral' } | null;

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  // 입력 아래 한 줄 안내 · 오류
  status?: FieldStatus;
  // 입력 아래 오른쪽 (예: 글자 수)
  trailing?: string;
  // 비밀번호: 보기 · 숨기기 버튼
  secret?: boolean;
};

// 로그인 · 가입 입력 칸. 설정의 닉네임 입력(ProfileForm)과 같은 모양이다.
export const AuthField = forwardRef<TextInput, Props>(function AuthField({ label, status, trailing, secret = false, ...input }, ref) {
  const { colors } = useTheme();
  const [shown, setShown] = useState(false);
  const warn = status?.tone === 'warning';
  const iconColor = warn ? colors.status.warning : status?.tone === 'ok' ? colors.status.success : colors.text.secondary;

  return (
    <View style={styles.field}>
      <AppText role="label" tone="secondary">
        {label}
      </AppText>
      <View style={[styles.box, { backgroundColor: colors.bg.surface, borderColor: warn ? colors.status.warning : 'transparent' }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.text.secondary}
          autoCorrect={false}
          autoCapitalize="none"
          maxFontSizeMultiplier={1.4}
          secureTextEntry={secret && !shown}
          {...input}
          style={[styles.input, { color: colors.text.primary }]}
        />
        {secret ? (
          <AppPressable
            onPress={() => setShown((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
            style={styles.toggle}
          >
            <AppText role="label" tone="secondary">
              {shown ? '숨기기' : '보기'}
            </AppText>
          </AppPressable>
        ) : null}
      </View>
      {status || trailing ? (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {status ? (
            <View style={styles.status}>
              {status.icon ? <AppIcon name={status.icon} size={14} color={iconColor} /> : null}
              <AppText role="caption" tone={status.tone === 'neutral' ? 'secondary' : 'primary'} style={styles.shrink}>
                {status.copy}
              </AppText>
            </View>
          ) : (
            <View />
          )}
          {trailing ? (
            <AppText role="caption" tone="secondary" tabular>
              {trailing}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    // 웹에서 입력 칸이 기본 너비를 고집해 보기 버튼을 밀어내지 않게
    minWidth: 0,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  toggle: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 18,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  shrink: {
    flexShrink: 1,
  },
});
