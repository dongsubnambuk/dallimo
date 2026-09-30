import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { ElevationProfile } from '@/components/ElevationProfile';
import { MetricBlock } from '@/components/MetricBlock';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import type { CourseDetail } from '@/entities/course/types';
import type { RunResult } from '@/entities/run/result';
import { SourceBadge } from '@/features/import/components/SourceBadge';
import { RecordState } from '@/features/run-result/components/RecordState';
import { ResultMap } from '@/features/run-result/components/ResultMap';
import { SplitList } from '@/features/run-result/components/SplitList';
import { WorkoutStepList } from '@/features/run-result/components/WorkoutStepList';
import { useRunResult } from '@/features/run-result/useRunResult';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

import { fullDateLabel, runTitle, startedAt } from './labels';

// SCR-M03 러닝 상세 (MY-004): 지도, 거리, 시간, 페이스, 스플릿, 검증 상태.
// 결과 화면(SCR-R04)과 같은 기록이지만, 달린 직후의 감정 피드백 · 다시 도전 대신 기록 자체를 먼저 보여준다 (73장 History).
export function RunDetailScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useRunResult(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my/runs'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
      </View>
      {state.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="기록 불러오는 중" />
        </View>
      ) : state.kind === 'notFound' ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            title="기록을 찾을 수 없어요"
            body="지워졌거나 다른 기기에서만 저장된 기록이에요."
            actions={<SecondaryButton label="러닝 기록으로" size="sm" onPress={() => router.replace('/my/runs')} />}
          />
        </View>
      ) : (
        <Detail run={state.result} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function Detail({ run: r, bottomInset }: { run: RunResult; bottomInset: number }) {
  const { colors } = useTheme();
  const course = useCourse(r.course?.id ?? null);
  const courseTime = r.course?.timeSec ?? null;
  const pb = r.verification === 'verified' && !!r.pb?.improved;

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.xxl }]} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <AppText role="label" tone="secondary">
          {fullDateLabel(startedAt(r))}
        </AppText>
        <AppText role="screenTitle" accessibilityRole="header">
          {runTitle({ ...r, workoutName: r.workout?.name })}
        </AppText>
        {r.source ? <SourceBadge source={r.source} /> : null}
        {r.course || pb || r.workout ? (
          <View style={styles.modeLine}>
            {r.course || r.workout ? (
              <AppText role="label" tone="secondary">
                {MODE_TITLE[r.mode]}
              </AppText>
            ) : null}
            {pb ? (
              <View style={[styles.pb, { backgroundColor: colors.action.primary }]}>
                <AppText role="caption" style={[styles.bold, { color: colors.action.onPrimary }]}>
                  이 코스 PB
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* 코스를 끝까지 달렸으면 코스 기록이 가장 크고, 아니면 거리가 가장 크다 */}
      <View style={styles.metrics}>
        {courseTime != null ? (
          <MetricBlock label="코스 기록" value={formatDuration(courseTime)} size="hero" labelPosition="top" />
        ) : (
          <MetricBlock label="거리" value={formatDistanceKm(r.distanceM)} unit="km" size="hero" labelPosition="top" />
        )}
        <View style={styles.metricRow}>
          {courseTime != null ? (
            <MetricBlock label="거리" value={formatDistanceKm(r.distanceM)} unit="km" size="medium" labelPosition="top" style={styles.flex} />
          ) : (
            <MetricBlock label="시간" value={formatDuration(r.activeSec)} size="medium" labelPosition="top" style={styles.flex} />
          )}
          <MetricBlock label="평균 페이스" value={formatPace(r.avgPaceSec)} unit="/km" size="medium" labelPosition="top" style={styles.flex} />
        </View>
      </View>

      {r.workout?.steps.length ? (
        <View style={styles.intervalSection}>
          <AppText role="sectionTitle" accessibilityRole="header">
            인터벌 구간
          </AppText>
          <WorkoutStepList steps={r.workout.steps} />
        </View>
      ) : null}

      <ResultMap path={r.path} course={course?.route ?? null} height={220} />

      <RecordState result={r} />

      {r.mode === 'FREE' ? (
        // CREG-001 자유 달리기 경로를 코스로 등록
        <SecondaryButton label="이 경로를 코스로 등록" size="sm" onPress={() => router.push({ pathname: '/course/new', params: { runId: r.id } })} style={styles.selfStart} />
      ) : null}
      {r.mode === 'INTERVAL' ? (
        <SecondaryButton label="인터벌 달리기 목록" size="sm" onPress={() => router.push('/training')} style={styles.selfStart} />
      ) : null}
      {r.course ? (
        <SecondaryButton
          label={`${r.course.name} 코스 보기`}
          size="sm"
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: r.course!.id } })}
          style={styles.selfStart}
        />
      ) : null}

      <View style={[styles.section, { borderTopColor: colors.border.subtle }]}>
        <AppText role="sectionTitle" accessibilityRole="header">
          {r.workout ? '1km 기록' : '구간 기록'}
        </AppText>
        <SplitList splits={r.splits} />
      </View>
      {courseTime != null && course?.elevationProfile ? (
        <View style={[styles.section, { borderTopColor: colors.border.subtle }]}>
          <AppText role="sectionTitle" accessibilityRole="header">
            고도
          </AppText>
          <ElevationProfile profile={course.elevationProfile} gainM={course.elevationGainM} />
        </View>
      ) : null}
    </ScrollView>
  );
}

// 결과 화면과 같은 키로 코스 상세를 읽어 캐시를 함께 쓴다
function useCourse(id: string | null): CourseDetail | null {
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const q = useQuery({
    queryKey: ['course', 'detail', id, 'normal'],
    queryFn: () => repo.getDetail(id as string),
    enabled: id != null,
    retry: false,
  });
  return q.data ?? null;
}

const styles = StyleSheet.create({
  intervalSection: {
    gap: spacing.sm,
  },
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: spacing.xl,
  },
  head: {
    gap: spacing.xs,
  },
  modeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pb: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  metrics: {
    gap: spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
