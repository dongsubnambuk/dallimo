import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { WorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';
import { RECOMMENDED_WORKOUTS } from '@/entities/workout/templates';
import type { WorkoutPlan } from '@/entities/workout/types';
import { WORKOUT_LIMITS } from '@/entities/workout/validate';
import { agoLabel } from '@/features/friends/labels';
import { RunRow } from '@/features/my/components/RunRow';
import { workoutParams } from '@/features/run-ready/runPlanParams';

import { WorkoutCard } from './components/WorkoutCard';
import { useRecentIntervalRuns, useWorkoutList } from './useWorkouts';

// 인터벌 달리기 (123.1장 TRAINING: 나의 인터벌 · 최근 훈련 · 추천 템플릿 · 직접 만들기). 125장 달리기 탭의 진입점.
// 인터벌을 누르면 달리기 준비(Run Ready)로 간다. 사용자에게 보이는 이름은 "인터벌 달리기" (FOUNDATION-DECISION-LOG 40항)
export function WorkoutListScreen({ scenario }: { scenario: WorkoutScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const list = useWorkoutList(scenario);
  const recent = useRecentIntervalRuns();
  // 고치거나 달리고 돌아오면 다시 읽는다
  const { refetch } = list;
  const refetchRecent = recent.refetch;
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchRecent();
    }, [refetch, refetchRecent]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/run'));
  const start = (w: WorkoutPlan) => router.dismissTo({ pathname: '/run', params: workoutParams(w) });
  const full = (list.data?.length ?? 0) >= WORKOUT_LIMITS.maxTemplates;
  const create = (template?: string) => router.push({ pathname: '/training/new', params: { ...(template ? { template } : {}), ...(scenario !== 'normal' ? { scenario } : {}) } });
  const edit = (id: string) => router.push({ pathname: '/training/[id]', params: { id, ...(scenario !== 'normal' ? { scenario } : {}) } });
  const recentRuns = recent.data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
          인터벌 달리기
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <AppText role="body" tone="secondary">
          빠르게 · 천천히를 반복해 달려요. 구간이 바뀌면 소리와 진동으로 알려 줘서 화면을 보지 않아도 돼요.
        </AppText>
        <AppPressable
          onPress={() => create()}
          disabled={full}
          accessibilityRole="button"
          accessibilityLabel="직접 만들기"
          accessibilityHint={full ? `인터벌은 ${WORKOUT_LIMITS.maxTemplates}개까지 저장할 수 있어요` : '구간을 골라 새 인터벌을 만들어요'}
          style={[styles.create, { backgroundColor: full ? colors.border.subtle : colors.action.secondary }]}
        >
          <AppIcon name="add" size={20} color={full ? colors.text.secondary : colors.action.onSecondary} />
          <AppText role="sectionTitle" style={[styles.createText, { color: full ? colors.text.secondary : colors.action.onSecondary }]}>
            직접 만들기
          </AppText>
        </AppPressable>
        {full ? (
          <AppText role="caption" tone="secondary">
            인터벌은 {WORKOUT_LIMITS.maxTemplates}개까지 저장할 수 있어요. 안 쓰는 인터벌을 지우면 새로 만들 수 있어요.
          </AppText>
        ) : null}

        <Section title="내 인터벌">
          {list.isPending ? (
            <BrandLoader size={36} label="내 인터벌 불러오는 중" />
          ) : list.isError ? (
            <StateNotice
              icon="warning"
              tone="warning"
              title="내 인터벌을 불러오지 못했어요"
              body="연결을 확인하고 다시 시도해 주세요. 추천 인터벌로는 바로 달릴 수 있어요."
              actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
            />
          ) : list.data.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.bg.surface }]}>
              <AppText role="body" style={styles.bold}>
                아직 만든 인터벌이 없어요
              </AppText>
              <AppText role="label" tone="secondary">
                추천 인터벌로 달려 보거나, 직접 만들어 저장해 두면 다음에 바로 달릴 수 있어요.
              </AppText>
            </View>
          ) : (
            list.data.map((w) => (
              <WorkoutCard
                key={w.id}
                name={w.name}
                blocks={w.blocks}
                caption={w.runCount > 0 && w.lastRunAt ? `${w.runCount}번 달림 · ${agoLabel(w.lastRunAt)}` : '아직 달리지 않았어요'}
                onStart={() => start(w)}
                action={{ label: '고치기', onPress: () => edit(w.id) }}
              />
            ))
          )}
        </Section>

        <Section title="추천 인터벌">
          {RECOMMENDED_WORKOUTS.map((t) => (
            <WorkoutCard key={t.key} name={t.name} blocks={t.blocks} caption={t.caption} onStart={() => start(t)} action={full ? undefined : { label: '고쳐서 저장', onPress: () => create(t.key) }} />
          ))}
        </Section>

        {recentRuns.length > 0 ? (
          <Section title="최근 인터벌 달리기">
            <View style={[styles.recent, { backgroundColor: colors.bg.surface }]}>
              {recentRuns.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText role="sectionTitle" accessibilityRole="header">
        {title}
      </AppText>
      {children}
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
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  create: {
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createText: {
    fontFamily: fontFamily.bold,
  },
  section: {
    gap: spacing.sm,
  },
  empty: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  recent: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
  },
});
