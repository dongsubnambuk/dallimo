import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import { type MockCourseScenario } from '@/entities/course/api/mockCourseRepository';
import type { MyCourse, MyCourseKind } from '@/entities/course/types';
import { formatCount, formatDuration } from '@/shared/format';

import { dayLabel } from './labels';

const TABS: { key: MyCourseKind; label: string }[] = [
  { key: 'created', label: '등록' },
  { key: 'saved', label: '저장' },
  { key: 'finished', label: '완주' },
];

const EMPTY: Record<MyCourseKind, { body: string; action: string; to: '/run' | '/' }> = {
  created: { body: '아직 등록한 코스가 없어요. 자유 달리기를 마치면 그 길을 코스로 올릴 수 있어요.', action: '달리기 시작', to: '/run' },
  saved: { body: '저장한 코스가 없어요. 코스 상세에서 저장하면 여기에 모여요.', action: '코스 찾기', to: '/' },
  finished: { body: '아직 완주한 코스가 없어요. 코스를 끝까지 달리면 여기에 모여요.', action: '코스 찾기', to: '/' },
};

// SCR-M04 내 코스 (MY-005): 등록 / 저장 / 완주 코스. 누르면 코스 상세.
export function MyCoursesScreen({ initialTab, scenario }: { initialTab: MyCourseKind; scenario: MockCourseScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<MyCourseKind>(initialTab);
  const repo = useMemo(() => getCourseRepository(scenario), [scenario]);
  const list = useQuery({ queryKey: ['course', 'mine', tab, scenario], queryFn: () => repo.getMine(tab), retry: false });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          내 코스
        </AppText>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <FilterChip key={t.key} label={t.label} selected={t.key === tab} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {list.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="내 코스 불러오는 중" />
        </View>
      ) : list.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="코스를 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
          />
        </View>
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CourseCard
              title={item.name}
              distanceM={item.distanceM}
              tags={item.tags}
              route={item.displayRoute}
              recordContext={contextOf(tab, item)}
              socialContext={item.finisherCount > 0 ? `완주 ${formatCount(item.finisherCount)}명` : undefined}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
              accessibilityHint="코스 상세를 열어요"
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxl }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText role="body" tone="secondary">
                {EMPTY[tab].body}
              </AppText>
              <SecondaryButton label={EMPTY[tab].action} emphasized size="sm" onPress={() => router.navigate(EMPTY[tab].to)} style={styles.selfStart} />
            </View>
          }
        />
      )}
    </View>
  );
}

function contextOf(tab: MyCourseKind, c: MyCourse): string | undefined {
  if (tab === 'created') return [c.createdAt ? `${dayLabel(new Date(c.createdAt))} 등록` : null, c.status === 'NEW' ? '새 코스' : null].filter(Boolean).join(' · ');
  if (tab === 'finished') return [c.myBestSec != null ? `내 PB ${formatDuration(c.myBestSec)}` : null, c.finishCount ? `${c.finishCount}회 완주` : null].filter(Boolean).join(' · ');
  return c.myBestSec != null ? `내 PB ${formatDuration(c.myBestSec)}` : undefined;
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
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    padding: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  empty: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
});
