import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import { CourseRepositoryError } from '@/entities/course/api/courseRepository';
import { COURSE_NAME_MAX } from '@/entities/course/api/courseRegistration';
import type { CourseDetail } from '@/entities/course/types';
import { useCourseDetail } from '@/features/course/useCourseDetail';
import { ConfirmSheet } from '@/features/settings/components/ConfirmSheet';
import { formatDistanceKm } from '@/shared/format';

import { CourseInfoFields, joinTimes, splitTimes, type CourseInfoValue } from './CourseInfoFields';

// 내 코스 고치기 (결정 로그 90항): 이름 · 설명 · 태그 · 추천 시간. 경로 · 거리는 등록할 때 정해져 바꾸지 않는다 (43.1장)
export function CourseEditScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useCourseDetail(id, 'normal');
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/course/[id]', params: { id } }));

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {state.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="코스 불러오는 중" />
        </View>
      ) : state.kind === 'ready' && state.course.isMine ? (
        <Form course={state.course} onClose={close} bottomInset={insets.bottom} />
      ) : (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            title={state.kind === 'error' ? '코스를 불러오지 못했어요' : '고칠 수 없는 코스예요'}
            body={state.kind === 'error' ? '연결을 확인하고 다시 시도해 주세요.' : '내가 만든 코스만 고칠 수 있어요.'}
            actions={<SecondaryButton label={state.kind === 'error' ? '다시 시도' : '닫기'} size="sm" onPress={state.kind === 'error' ? state.retry : close} />}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Form({ course, onClose, bottomInset }: { course: CourseDetail; onClose: () => void; bottomInset: number }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const initial = useMemo<CourseInfoValue>(
    () => ({ name: course.name, description: course.description ?? '', tags: course.tags, times: splitTimes(course.recommendedTime) }),
    [course],
  );
  const [info, setInfo] = useState<CourseInfoValue>(initial);
  const [confirmClose, setConfirmClose] = useState(false);
  const trimmed = info.name.trim();
  const nameOk = trimmed.length > 0 && trimmed.length <= COURSE_NAME_MAX;
  const dirty =
    trimmed !== initial.name ||
    info.description.trim() !== initial.description.trim() ||
    info.tags.join() !== initial.tags.join() ||
    joinTimes(info.times) !== joinTimes(initial.times);
  const tryClose = () => (dirty ? setConfirmClose(true) : onClose());

  const save = useMutation({
    mutationFn: () => repo.edit(course.id, { name: trimmed, description: info.description.trim() || null, tags: info.tags, recommendedTime: joinTimes(info.times) }),
    onSuccess: (next) => {
      queryClient.setQueryData(['course', 'detail', course.id, 'normal'], next);
      // 탐색 목록 · 검색 · 내 코스에도 새 이름이 보이게
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'course' || q.queryKey[0] === 'courses' });
      onClose();
    },
  });
  const error =
    save.error instanceof CourseRepositoryError && (save.error.kind === 'hidden' || save.error.kind === 'notFound')
      ? save.error.message
      : save.isError
        ? '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'
        : null;

  return (
    <>
      <View style={styles.header}>
        <AppPressable onPress={tryClose} accessibilityLabel="닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="close" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
          코스 고치기
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.note}>
          <AppIcon name="map" size={16} color={colors.text.secondary} />
          <AppText role="caption" tone="secondary" style={styles.flex}>
            경로와 거리({formatDistanceKm(course.distanceM, 1)}km)는 등록할 때 정해져서 바꿀 수 없어요.
          </AppText>
        </View>
        <CourseInfoFields value={info} onChange={setInfo} />
        {error ? (
          <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <SecondaryButton label={save.isPending ? '저장하는 중' : '저장'} emphasized disabled={!nameOk || !dirty || save.isPending} onPress={() => save.mutate()} />
      </ScrollView>
      {confirmClose ? (
        <ConfirmSheet
          title="고친 내용을 버릴까요?"
          body="저장하지 않은 내용이 사라져요."
          confirmLabel="버리기"
          danger
          onConfirm={() => {
            setConfirmClose(false);
            onClose();
          }}
          onClose={() => setConfirmClose(false)}
        />
      ) : null}
    </>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    padding: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
