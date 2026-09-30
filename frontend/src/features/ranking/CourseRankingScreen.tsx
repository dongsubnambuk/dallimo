import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import type { CourseTitleKind } from '@/components/CourseTitleBadge';
import { FilterChip } from '@/components/FilterChip';
import { RankingRow } from '@/components/RankingRow';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import type { RankingScenario } from '@/entities/ranking/api/mockRankingRepository';
import type { MyStanding, RankingEntry, RankingPeriod, RankingScope } from '@/entities/ranking/types';
import { formatCount, formatDuration, formatDurationSpoken } from '@/shared/format';

import { CourseTitlesCard } from './components/CourseTitlesCard';
import { useCourseRanking } from './useCourseRanking';
import { titlesOf, useCourseTitles } from './useCourseTitles';

export type RankingTab = 'weekly' | 'monthly' | 'all' | 'friends';

// SCR-E04 코스 랭킹 탭: 전체/주간/월간/친구 (RNK-001~004). 이번 주가 먼저인 것은 코스 상세 미리보기와 같은 기준이라서다.
const TABS: { key: RankingTab; label: string; scope: RankingScope; period: RankingPeriod }[] = [
  { key: 'weekly', label: '이번 주', scope: 'all', period: 'weekly' },
  { key: 'monthly', label: '이번 달', scope: 'all', period: 'monthly' },
  { key: 'all', label: '전체 기간', scope: 'all', period: 'all' },
  { key: 'friends', label: '친구', scope: 'friends', period: 'all' },
];

const EMPTY_COPY: Record<RankingTab, string> = {
  weekly: '이번 주 인증 기록이 아직 없어요. 첫 기록이 1위가 돼요.',
  monthly: '이번 달 인증 기록이 아직 없어요. 첫 기록이 1위가 돼요.',
  all: '이 코스의 인증 기록이 아직 없어요. 첫 기록이 1위가 돼요.',
  friends: '이 코스를 달린 친구가 아직 없어요.',
};

// SCR-E04 코스 랭킹. 73장 "1등뿐 아니라 내 순위/주변 사용자/친구를 빠르게 찾음".
// 89장: 일반 list보다 self-anchor가 중요하고 podium은 과장하지 않는다.
// 레퍼런스: Strava Segment 리더보드(내 주변), RUNPLE 주간 리그, 루티니스트 "총 N명 중 M등" — CLAUDE.md 4항 Ranking.
export function CourseRankingScreen({ courseId, initialTab, scenario }: { courseId: string; initialTab: RankingTab; scenario: RankingScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<RankingTab>(initialTab);
  const t = TABS.find((x) => x.key === tab)!;
  const { list, standing, entries } = useCourseRanking(courseId, t.scope, t.period, scenario);
  // 124장: 크라운 · 레전드를 가진 사람 줄에 표시
  const titles = useCourseTitles(courseId, scenario);
  const course = useCourseName(courseId);
  const listRef = useRef<FlatList<RankingEntry>>(null);
  const [cardBottom, setCardBottom] = useState(0);
  const [showJump, setShowJump] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setShowJump(cardBottom > 0 && e.nativeEvent.contentOffset.y > cardBottom);
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/course/[id]', params: { id: courseId } }));
  const run = () => router.push({ pathname: '/course/[id]/play', params: { id: courseId } });
  const me = standing.data?.entry ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <View style={styles.titleBlock}>
          <AppText role="caption" tone="secondary">
            코스 랭킹
          </AppText>
          <AppText role="sectionTitle" numberOfLines={1} accessibilityRole="header">
            {course ?? ' '}
          </AppText>
        </View>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((x) => (
          <FilterChip key={x.key} label={x.label} selected={x.key === tab} onPress={() => setTab(x.key)} />
        ))}
      </View>

      {list.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="랭킹 불러오는 중" />
        </View>
      ) : list.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="랭킹을 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(e) => e.userId}
          renderItem={({ item }) => (
            <RankingRow
              rank={item.rank}
              name={item.name}
              timeSec={item.timeSec}
              paceSecPerKm={item.paceSecPerKm}
              relation={item.relation}
              isPB={item.isPB}
              titles={titlesOf(titles.data, item.userId)}
            />
          )}
          // 떠 있는 "내 순위" 버튼 높이만큼 아래를 비워 마지막 줄을 가리지 않는다
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + touchTarget.min + spacing.huge }]}
          onScroll={onScroll}
          scrollEventThrottle={64}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={
            <View onLayout={(e) => setCardBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
              {/* 순위표가 비었으면 아래 빈 상태 안내 하나만 보여준다 */}
              {entries.length > 0 ? <MyStandingCard standing={standing.data ?? null} loading={standing.isPending} tab={tab} onRun={run} titleOf={(id) => titlesOf(titles.data, id)} /> : null}
              {titles.data ? (
                <View style={styles.titles}>
                  <CourseTitlesCard titles={titles.data} />
                </View>
              ) : null}
              {entries.length > 0 ? (
                <View style={styles.listHead}>
                  <AppText role="sectionTitle" accessibilityRole="header">
                    순위
                  </AppText>
                  <AppText role="caption" tone="secondary">
                    인증된 기록만 반영돼요
                  </AppText>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText role="body" tone="secondary">
                {EMPTY_COPY[tab]}
              </AppText>
              {tab !== 'friends' ? <SecondaryButton label="이 코스 달리기" emphasized size="sm" onPress={run} style={styles.selfStart} /> : null}
            </View>
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.footer}>
                <BrandLoader size={28} label="순위 더 불러오는 중" />
              </View>
            ) : entries.length > 0 && !list.hasNextPage ? (
              <AppText role="caption" tone="secondary" style={styles.end}>
                마지막 순위예요 · 총 {formatCount(standing.data?.total ?? entries.length)}명
              </AppText>
            ) : null
          }
        />
      )}

      {/* 내 순위 카드가 화면 밖으로 나가면 돌아갈 수 있게 한다 (self anchor) */}
      {showJump && me ? (
        <AppPressable
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          accessibilityLabel={`내 순위 ${me.rank}위로 돌아가기`}
          style={[styles.jump, { bottom: insets.bottom + spacing.lg, backgroundColor: colors.action.secondary, boxShadow: elevation.mapOverlay }]}
        >
          <View style={[styles.jumpDot, { backgroundColor: colors.action.primary }]} />
          <AppText role="label" style={[styles.bold, { color: colors.action.onSecondary }]}>
            내 순위 {formatCount(me.rank)}위
          </AppText>
        </AppPressable>
      ) : null}
    </View>
  );
}

// RNK-005 내 주변 순위 + "총 N명 중 M등". 탐색 티켓·코스 상세 경쟁 카드와 같은 검정 표면.
type StandingProps = { standing: MyStanding | null; loading: boolean; tab: RankingTab; onRun: () => void; titleOf: (userId: string) => CourseTitleKind[] };

function MyStandingCard(props: StandingProps) {
  return (
    <ThemeProvider scheme="dark">
      <StandingBody {...props} />
    </ThemeProvider>
  );
}

function StandingBody({ standing, loading, tab, onRun, titleOf }: StandingProps) {
  const { colors } = useTheme();
  if (loading || !standing) {
    return (
      <View style={[styles.card, styles.cardLoading, { backgroundColor: colors.bg.canvas }]}>
        <BrandLoader size={32} label="내 순위 불러오는 중" />
      </View>
    );
  }
  const me = standing.entry;
  if (!me) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bg.canvas }]}>
        <AppText role="sectionTitle">{tab === 'friends' ? '친구 랭킹에 내 기록이 없어요' : '아직 순위가 없어요'}</AppText>
        <AppText role="label" tone="secondary">
          이 코스를 완주하고 기록이 인증되면 순위가 생겨요
        </AppText>
        <SecondaryButton label="이 코스 달리기" emphasized size="sm" onPress={onRun} style={styles.selfStart} />
      </View>
    );
  }
  const idx = standing.around.findIndex((e) => e.userId === me.userId);
  const above = idx > 0 ? standing.around[idx - 1] : null;
  const gap = above ? me.timeSec - above.timeSec : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.canvas }]}>
      <View style={styles.cardTop} accessible accessibilityLabel={`${formatCount(standing.total)}명 중 ${me.rank}위, 기록 ${formatDuration(me.timeSec)}`}>
        <View>
          <AppText role="label" tone="secondary">
            내 순위
          </AppText>
          <View style={styles.rankLine}>
            <AppText role="metricLarge" tone="accent" tabular>
              {formatCount(me.rank)}
            </AppText>
            <AppText role="sectionTitle" style={styles.bold}>
              위
            </AppText>
            <AppText role="label" tone="secondary" tabular>
              {' '}/ {formatCount(standing.total)}명
            </AppText>
          </View>
        </View>
        <View style={styles.cardRecord}>
          <AppText role="label" tone="secondary">
            내 기록
          </AppText>
          <AppText role="sectionTitle" tabular style={styles.bold}>
            {formatDuration(me.timeSec)}
          </AppText>
        </View>
      </View>
      <AppText role="label" tone={above ? 'primary' : 'accent'} style={styles.bold}>
        {above && gap != null ? `${formatCount(above.rank)}위까지 ${gap <= 0 ? '같은 기록' : formatDurationSpoken(gap)}` : '1위를 지키고 있어요'}
      </AppText>
      <View style={[styles.around, { borderTopColor: colors.border.subtle }]}>
        {standing.around.map((e) => (
          <RankingRow key={e.userId} rank={e.rank} name={e.name} timeSec={e.timeSec} relation={e.relation} isPB={e.isPB} titles={titleOf(e.userId)} />
        ))}
      </View>
    </View>
  );
}

function useCourseName(id: string): string | null {
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const q = useQuery({ queryKey: ['course', 'detail', id, 'normal'], queryFn: () => repo.getDetail(id), retry: false });
  return q.data?.name ?? null;
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
  titleBlock: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  cardLoading: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rankLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  cardRecord: {
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
  },
  around: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginHorizontal: -spacing.md,
  },
  titles: {
    marginTop: spacing.lg,
  },
  listHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  empty: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  selfStart: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  end: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  jump: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  jumpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
