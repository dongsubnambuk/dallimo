import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRegistration } from '@/entities/course/api';
import { CourseRepositoryError } from '@/entities/course/api/courseRepository';
import { COURSE_NAME_MAX } from '@/entities/course/api/courseRegistration';
import { type RegisterScenario } from '@/entities/course/api/mockCourseRegistration';
import type { RunResult } from '@/entities/run/result';
import { RoutePreview } from '@/features/my/components/RoutePreview';
import { dayLabel, startedAt } from '@/features/my/labels';
import { ResultMap } from '@/features/run-result/components/ResultMap';
import { useRunResult } from '@/features/run-result/useRunResult';
import { ConfirmSheet } from '@/features/settings/components/ConfirmSheet';
import { formatDistanceKm, formatDuration } from '@/shared/format';
import { regionNameAt } from '@/shared/location/regionName';

import { CourseInfoFields, joinTimes, type CourseInfoValue } from './CourseInfoFields';

// SCR-E05 코스 등록 (CREG-001~004). 3.2장 코스 생성 흐름: 자유 러닝 완료 → 코스로 공유 → 정보 입력 → 경로 확인 → 등록.
export function CourseCreateScreen({ runId, scenario }: { runId: string; scenario: RegisterScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const run = useRunResult(runId);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {run.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="기록 불러오는 중" />
        </View>
      ) : run.kind === 'notFound' ? (
        <View style={styles.pad}>
          <StateNotice icon="warning" title="기록을 찾을 수 없어요" body="내 러닝 기록으로만 코스를 만들 수 있어요." actions={<SecondaryButton label="닫기" size="sm" onPress={close} />} />
        </View>
      ) : (
        <Form run={run.result} scenario={scenario} onClose={close} bottomInset={insets.bottom} />
      )}
    </KeyboardAvoidingView>
  );
}

function Form({ run, scenario, onClose, bottomInset }: { run: RunResult; scenario: RegisterScenario; onClose: () => void; bottomInset: number }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const repo = useMemo(() => getCourseRegistration(scenario), [scenario]);
  const [step, setStep] = useState<'info' | 'route'>('info');
  const [info, setInfo] = useState<CourseInfoValue>({ name: '', description: '', tags: [], times: [] });
  const { name, description, tags, times } = info;
  // 입력한 내용이 있으면 닫기 전에 묻는다 (결정 로그 82항)
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty = name.trim() !== '' || description.trim() !== '' || tags.length > 0 || times.length > 0;
  const tryClose = () => (dirty ? setConfirmClose(true) : onClose());
  // 출발점 지역 이름 (CRS-003 지역 검색). 휴대폰 지오코더, 못 찾으면 비워 둔다
  const start = run.path[0] ?? null;
  const region = useQuery({ queryKey: ['region', start?.latitude, start?.longitude], queryFn: () => (start ? regionNameAt(start) : null), staleTime: Infinity });
  const trimmed = name.trim();
  const nameOk = trimmed.length > 0 && trimmed.length <= COURSE_NAME_MAX;
  const blocked = run.sync !== 'synced' ? '기록을 서버에 올린 뒤에 코스로 등록할 수 있어요' : null;

  const register = useMutation({
    mutationFn: () =>
      repo.create({
        sourceRunId: run.id,
        name: trimmed,
        description: description.trim() || null,
        tags,
        recommendedTime: joinTimes(times),
        region: region.data ?? null,
      }),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['course', 'mine'] });
      router.replace({ pathname: '/course/[id]', params: { id: course.id } });
    },
  });
  const error = register.error instanceof CourseRepositoryError && register.error.kind === 'invalid' ? register.error.message : register.isError ? '등록하지 못했어요. 연결을 확인하고 다시 시도해 주세요.' : null;

  return (
    <>
      <View style={styles.header}>
        <AppPressable
          onPress={step === 'route' ? () => setStep('info') : tryClose}
          accessibilityLabel={step === 'route' ? '정보 입력으로 돌아가기' : '닫기'}
          style={[styles.round, { backgroundColor: colors.bg.surface }]}
        >
          <AppIcon name={step === 'route' ? 'back' : 'close'} size={20} color={colors.text.primary} />
        </AppPressable>
        <View style={styles.flex}>
          <AppText role="caption" tone="secondary">
            {step === 'info' ? '1/2 정보 입력' : '2/2 경로 확인'}
          </AppText>
          <AppText role="sectionTitle" accessibilityRole="header">
            코스 등록
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.xl }]} keyboardShouldPersistTaps="handled">
        {step === 'info' ? (
          <>
            {/* 어떤 기록으로 만드는지 */}
            <View style={[styles.source, { backgroundColor: colors.bg.surface }]}>
              <RoutePreview points={run.path} course={false} />
              <View style={styles.flex}>
                <AppText role="label" style={styles.bold}>
                  {dayLabel(startedAt(run))} 자유 달리기
                </AppText>
                <AppText role="caption" tone="secondary" tabular>
                  {formatDistanceKm(run.distanceM)}km · {formatDuration(run.activeSec)}
                </AppText>
              </View>
            </View>

            {/* 서버에 없는 기록은 등록할 수 없다. 입력하기 전에 먼저 알린다 */}
            {blocked ? (
              <View style={styles.note} accessibilityLiveRegion="polite">
                <AppIcon name="offline" size={16} color={colors.status.warning} />
                <AppText role="label" style={styles.flex}>
                  {blocked}
                </AppText>
              </View>
            ) : null}
            <CourseInfoFields value={info} onChange={setInfo} />
            <SecondaryButton label="경로 확인" emphasized disabled={!nameOk || !!blocked} onPress={() => setStep('route')} />
          </>
        ) : (
          <>
            {/* CREG-003 등록 전 지도 확인 */}
            <ResultMap path={run.path} course={null} height={300} />
            <View style={styles.legend}>
              <Legend dot="start" label="출발" />
              <Legend dot="end" label="도착" />
              <AppText role="label" tone="secondary" tabular>
                {formatDistanceKm(Math.round(run.distanceM / 100) * 100, 1)}km
              </AppText>
            </View>
            <View style={[styles.summary, { backgroundColor: colors.bg.surface }]}>
              {region.data ? (
                <AppText role="caption" tone="secondary">
                  {region.data}
                </AppText>
              ) : null}
              <AppText role="sectionTitle" numberOfLines={2}>
                {trimmed}
              </AppText>
              {description.trim() ? (
                <AppText role="body" tone="secondary" numberOfLines={3}>
                  {description.trim()}
                </AppText>
              ) : null}
              {tags.length || times.length ? (
                <AppText role="label" tone="secondary">
                  {[...tags, ...(times.length ? [`추천 ${joinTimes(times)}`] : [])].join(' · ')}
                </AppText>
              ) : null}
            </View>
            {/* course.visibility 기본값 PUBLIC. 공개 정책(검토 여부)은 오픈 이슈 */}
            <View style={styles.note}>
              <AppIcon name="warning" size={16} color={colors.status.warning} />
              <AppText role="caption" tone="secondary" style={styles.flex}>
                등록하면 누구나 이 코스와 출발 · 도착 지점을 볼 수 있어요. 집이나 회사 앞에서 시작한 기록이라면 등록하지 않는 걸 권해요.
              </AppText>
            </View>
            {error ? (
              <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : null}
            <SecondaryButton label={register.isPending ? '등록하는 중' : '코스 등록'} emphasized disabled={register.isPending} onPress={() => register.mutate()} />
          </>
        )}
      </ScrollView>
      {confirmClose ? (
        <ConfirmSheet
          title="코스 등록을 그만할까요?"
          body="입력한 이름과 설명이 사라져요."
          confirmLabel="그만하기"
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

// 결과 지도와 같은 표시: 출발은 흰 원 + 짙은 민트 테두리, 도착은 검정 점
function Legend({ dot, label }: { dot: 'start' | 'end'; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View
        style={
          dot === 'start'
            ? { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.bg.elevated, borderWidth: 3, borderColor: colors.route.casing }
            : { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.route.actual }
        }
      />
      <AppText role="label" tone="secondary">
        {label}
      </AppText>
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
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: -spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summary: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
