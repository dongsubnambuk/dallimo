import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import type { CourseDetail, ReviewInput, ReviewScore } from '@/entities/course/types';

import { REVIEW_QUESTIONS } from './reviewLabels';
import { useCourseDetail } from './useCourseDetail';

const CONTENT_MAX = 1000;
const RATING_WORDS = ['별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요'];

// REV-001 코스 평가 쓰기. 완주자 기반 환경 평가: 별점(필수) + 신호 · 야간 · 혼잡 · 노면 · 화장실 · 급수(선택) + 한 줄.
// 이 코스를 인증 완주한 사람만 쓴다. 다시 쓰면 내 평가가 바뀐다.
export function CourseReviewScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useCourseDetail(id, 'normal');
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/course/[id]', params: { id } }));

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="코스 평가" caption={state.kind === 'ready' ? state.course.name : ''} onClose={close} />
      {state.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="코스 불러오는 중" />
        </View>
      ) : state.kind !== 'ready' ? (
        <View style={styles.pad}>
          <StateNotice icon="warning" title="코스를 불러오지 못했어요" body="잠시 뒤 다시 시도해 주세요." actions={<SecondaryButton label="닫기" size="sm" onPress={close} />} />
        </View>
      ) : !state.course.rating.canReview ? (
        <View style={styles.pad}>
          <StateNotice
            icon="finished"
            title="완주한 코스만 평가할 수 있어요"
            body="이 코스를 달려 인증 기록을 남기면 평가를 쓸 수 있어요."
            actions={<SecondaryButton label="닫기" size="sm" onPress={close} />}
          />
        </View>
      ) : (
        <Form course={state.course} onDone={close} bottomInset={insets.bottom} />
      )}
    </KeyboardAvoidingView>
  );
}

function Form({ course, onDone, bottomInset }: { course: CourseDetail; onDone: () => void; bottomInset: number }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const mine = course.rating.mine;
  const [rating, setRating] = useState<number>(mine?.rating ?? 0);
  const [scores, setScores] = useState<Pick<ReviewInput, 'signalScore' | 'nightScore' | 'crowdScore' | 'surfaceScore'>>({
    signalScore: mine?.signalScore ?? null,
    nightScore: mine?.nightScore ?? null,
    crowdScore: mine?.crowdScore ?? null,
    surfaceScore: mine?.surfaceScore ?? null,
  });
  const [toilet, setToilet] = useState<boolean | null>(mine?.hasToilet ?? null);
  const [water, setWater] = useState<boolean | null>(mine?.hasWater ?? null);
  const [content, setContent] = useState(mine?.content ?? '');

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['course', 'detail', course.id] }),
      queryClient.invalidateQueries({ queryKey: ['course', course.id, 'reviews'] }),
    ]);
  const save = useMutation({
    mutationFn: () => repo.writeReview(course.id, { rating, ...scores, hasToilet: toilet, hasWater: water, content: content.trim() || null }),
    onSuccess: () => refresh().then(onDone),
  });
  const remove = useMutation({ mutationFn: () => repo.deleteReview(course.id), onSuccess: () => refresh().then(onDone) });
  // 같은 답을 다시 누르면 고르지 않은 것으로 (선택 질문)
  const pick = <T,>(cur: T | null, v: T) => (cur === v ? null : v);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.xl }]} keyboardShouldPersistTaps="handled">
      <Field label="이 코스 어땠나요?" required>
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <AppPressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === n }}
              accessibilityLabel={`${n}점 ${RATING_WORDS[n - 1]}`}
              style={styles.star}
            >
              <AppIcon name="star" size={32} color={n <= rating ? colors.text.accent : colors.border.strong} />
            </AppPressable>
          ))}
        </View>
        <AppText role="label" tone={rating ? 'primary' : 'secondary'}>
          {rating ? RATING_WORDS[rating - 1] : '별을 눌러 골라 주세요'}
        </AppText>
      </Field>

      <AppText role="caption" tone="secondary">
        아래는 고르지 않아도 돼요. 다른 러너가 코스 상세 러닝 환경에서 봐요.
      </AppText>
      {REVIEW_QUESTIONS.map((q) => (
        <Field key={q.key} label={q.label}>
          <View style={styles.chips}>
            {q.answers.map((a, i) => (
              <FilterChip
                key={a}
                label={a}
                selected={scores[q.key] === i + 1}
                onPress={() => setScores((s) => ({ ...s, [q.key]: pick(s[q.key], (i + 1) as ReviewScore) }))}
              />
            ))}
          </View>
        </Field>
      ))}
      <Field label="화장실">
        <View style={styles.chips}>
          <FilterChip label="있어요" selected={toilet === true} onPress={() => setToilet(pick(toilet, true))} />
          <FilterChip label="없어요" selected={toilet === false} onPress={() => setToilet(pick(toilet, false))} />
        </View>
      </Field>
      <Field label="급수대">
        <View style={styles.chips}>
          <FilterChip label="있어요" selected={water === true} onPress={() => setWater(pick(water, true))} />
          <FilterChip label="없어요" selected={water === false} onPress={() => setWater(pick(water, false))} />
        </View>
      </Field>
      <Field label="한 줄 평" hint={`${content.trim().length}/${CONTENT_MAX}`}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="달릴 때 알아 두면 좋은 점"
          placeholderTextColor={colors.text.secondary}
          accessibilityLabel="한 줄 평"
          maxLength={CONTENT_MAX}
          multiline
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary }]}
        />
      </Field>

      {save.isError || remove.isError ? (
        <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
          저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
        </AppText>
      ) : null}
      <SecondaryButton
        label={save.isPending ? '저장하는 중' : mine ? '평가 고치기' : '평가 남기기'}
        emphasized
        disabled={!rating || save.isPending || remove.isPending}
        onPress={() => save.mutate()}
      />
      {mine ? <SecondaryButton label={remove.isPending ? '지우는 중' : '내 평가 지우기'} size="sm" disabled={remove.isPending} onPress={() => remove.mutate()} style={styles.remove} /> : null}
    </ScrollView>
  );
}

export function Header({ title, caption, onClose }: { title: string; caption: string; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <AppPressable onPress={onClose} accessibilityLabel="닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
        <AppIcon name="close" size={20} color={colors.text.primary} />
      </AppPressable>
      <View style={styles.flex}>
        <AppText role="caption" tone="secondary" numberOfLines={1}>
          {caption}
        </AppText>
        <AppText role="sectionTitle" accessibilityRole="header">
          {title}
        </AppText>
      </View>
    </View>
  );
}

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <AppText role="label" style={styles.bold}>
          {label}
          {required ? <AppText role="label" style={{ color: colors.status.danger }}> *</AppText> : null}
        </AppText>
        {hint ? (
          <AppText role="caption" tone="secondary" tabular>
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export const formStyles = StyleSheet.create({
  input: {
    minHeight: 96,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    padding: spacing.lg,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  star: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: formStyles.input,
  remove: {
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
