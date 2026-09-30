import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getActivityRepository } from '@/entities/activity/api';
import type { ActivityScenario } from '@/entities/activity/api/mockActivityRepository';
import type { ActivityType } from '@/entities/activity/types';
import { agoLabel } from '@/features/friends/labels';

import { activityText } from './activityText';

const ICON: Record<ActivityType, IconName> = {
  PB: 'trophy',
  WEEKLY_TOP: 'rankUp',
  CHALLENGE_WON: 'modeRival',
  COURSE_CREATED: 'map',
  CROWN: 'crown',
  LEGEND: 'legend',
};

// SCR-M06 친구 활동 (ACT-001~002). 행동형 피드: PB · 코스 등록 · 도전 성공 · 이번 주 랭킹.
// 65장: 독립 탭이 아니라 마이 · 친구에서 들어온다. 사진 · 좋아요 · 댓글 없는 소식 목록이고, 누르면 그 코스로 간다 (코스가 중심).
export function ActivityScreen({ scenario }: { scenario: ActivityScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => getActivityRepository(scenario), [scenario]);
  const list = useInfiniteQuery({
    queryKey: ['activities', scenario],
    queryFn: ({ pageParam }) => repo.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
          친구 활동
        </AppText>
      </View>

      {list.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="친구 활동 불러오는 중" />
        </View>
      ) : list.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="친구 활동을 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onRefresh={() => list.refetch()}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
          renderItem={({ item: a }) => {
            const t = activityText(a);
            return (
              <AppPressable
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: a.course.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${t.title}, ${t.detail}, ${agoLabel(a.createdAt)}`}
                accessibilityHint="코스 상세를 열어요"
                style={[styles.row, a.isMine && { backgroundColor: colors.action.tint }]}
              >
                <View style={[styles.icon, { backgroundColor: colors.bg.surface }]}>
                  <AppIcon name={ICON[a.type]} size={20} color={a.type === 'COURSE_CREATED' ? colors.text.primary : colors.text.accent} />
                </View>
                <View style={styles.flex}>
                  <AppText role="body" style={styles.bold} numberOfLines={2}>
                    {t.title}
                  </AppText>
                  <AppText role="label" tone="secondary" tabular numberOfLines={2}>
                    {t.detail}
                  </AppText>
                  <AppText role="caption" tone="secondary">
                    {agoLabel(a.createdAt)}
                  </AppText>
                </View>
                <AppIcon name="collapse" size={18} color={colors.text.secondary} />
              </AppPressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.pad}>
              <StateNotice
                icon="tabTogether"
                title="아직 친구 활동이 없어요"
                body="친구가 코스를 달려 기록을 세우거나 새 코스를 만들면 여기에 모여요."
                actions={<SecondaryButton label="친구 찾기" size="sm" emphasized onPress={() => router.push('/my/friends')} />}
              />
            </View>
          }
          ListFooterComponent={list.isFetchingNextPage ? <BrandLoader size={28} label="더 불러오는 중" /> : null}
        />
      )}
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
  list: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    minHeight: touchTarget.min + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
