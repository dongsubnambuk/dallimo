import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import type { ReportReason } from '@/entities/course/types';

import { Field, formStyles, Header } from './CourseReviewScreen';
import { REPORT_REASONS } from './reviewLabels';
import { useCourseDetail } from './useCourseDetail';

const CONTENT_MAX = 1000;

// CREG-005 코스 신고: 위험 · 사유지 · 잘못된 정보. 한 사람이 한 번 (다시 하면 사유가 바뀐다).
export function CourseReportScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useCourseDetail(id, 'normal');
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [content, setContent] = useState('');
  const send = useMutation({ mutationFn: () => repo.report(id, reason!, content.trim() || null) });
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/course/[id]', params: { id } }));

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="코스 신고" caption={state.kind === 'ready' ? state.course.name : ''} onClose={close} />
      {send.isSuccess ? (
        <View style={styles.pad}>
          <StateNotice
            icon="check"
            title="신고를 받았어요"
            body="확인한 뒤 코스를 고치거나 숨길게요. 위험한 곳이라면 달리기 전에 한 번 더 살펴 주세요."
            actions={<SecondaryButton label="닫기" size="sm" emphasized onPress={close} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          <Field label="어떤 문제인가요?" required>
            <View style={styles.reasons} accessibilityRole="radiogroup">
              {REPORT_REASONS.map((r) => {
                const on = reason === r.key;
                return (
                  <AppPressable
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={[r.label, r.hint].filter(Boolean).join(', ')}
                    style={[styles.reason, { backgroundColor: on ? colors.action.tint : colors.bg.surface, borderColor: on ? colors.text.accent : 'transparent' }]}
                  >
                    <AppIcon name={on ? 'ready' : 'noData'} size={18} color={on ? colors.text.accent : colors.text.secondary} />
                    <View style={styles.flex}>
                      <AppText role="label" style={styles.bold}>
                        {r.label}
                      </AppText>
                      {r.hint ? (
                        <AppText role="caption" tone="secondary">
                          {r.hint}
                        </AppText>
                      ) : null}
                    </View>
                  </AppPressable>
                );
              })}
            </View>
          </Field>
          <Field label="자세히" hint={`${content.trim().length}/${CONTENT_MAX}`}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="어디가 어떻게 문제인지 적어 주면 빨리 확인할 수 있어요 (선택)"
              placeholderTextColor={colors.text.secondary}
              accessibilityLabel="신고 내용"
              maxLength={CONTENT_MAX}
              multiline
              maxFontSizeMultiplier={1.4}
              style={[formStyles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
            />
          </Field>
          {send.isError ? (
            <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
              보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.
            </AppText>
          ) : null}
          <SecondaryButton label={send.isPending ? '보내는 중' : '신고하기'} emphasized disabled={!reason || send.isPending} onPress={() => send.mutate()} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pad: {
    padding: spacing.lg,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  reasons: {
    gap: spacing.sm,
  },
  reason: {
    minHeight: touchTarget.min + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.control,
    borderWidth: 1.5,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
