import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSymbol } from '@/components/Brand';
import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { CourseSummary } from '@/entities/course/types';
import { AppDivider, AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, OBLIQUE_SKEW, radius, spacing, touchTarget, typography } from '@/design/tokens';
import { formatCount, formatDistanceKm, formatDuration } from '@/shared/format';

import { DEFAULT_REGION_CENTER } from './api/mockCourseRepository';
import { MOCK_MAP_BASE } from './api/mockMapBase';
import { parseScenario } from './api/scenario';
import { ExploreMap } from './components/ExploreMap';
import { StateNotice } from './components/StateNotice';
import { useNearbyCourses } from './useNearbyCourses';

// SCR-E01 Explore 홈 (CRS-001 주변 코스, CRS-004 빠른 필터·정렬, LOC-001/002 위치 권한).
// 89장: 밝은 지도 55~65% + 하단 코스 결과, 상단 검색은 지도 위 고정, 선택 코스가 route signal로 강조.
// 74장 필수 상태: loading, location denied, no nearby course, network error, map ready, list ready.
// v0.5 (FOUNDATION-DECISION-LOG 10항): 무채색 브랜드 지도 위 형광 민트 코스, 검정 코스 티켓(1위 기록·내 PB·이번 주 러너),
// 지도 위에는 이번 주 러너 수와 검색만 두고 필터·정렬은 시트로 내렸다.

const DEFAULT_RADIUS_M = 3000;
const WIDE_RADIUS_M = 10000;
const MAP_RATIO = 0.64;
const SHEET_OVERLAP = spacing.xxl;
const TOP_BAR_HEIGHT = 44;
const TICKET_HEIGHT = 148;

type QuickFilter = { key: string; label: string; match: (c: CourseSummary) => boolean };

const QUICK_FILTERS: QuickFilter[] = [
  { key: 'short', label: '3~5km', match: (c) => c.distanceM >= 3000 && c.distanceM <= 5000 },
  { key: 'flat', label: '평지', match: (c) => c.tags.includes('평지') },
  { key: 'night', label: '야간 밝음', match: (c) => c.tags.includes('야간 밝음') },
  { key: 'easy', label: '초보 추천', match: (c) => c.tags.includes('초보 추천') },
];

type SortKey = 'near' | 'popular' | 'short';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'near', label: '가까운 순' },
  { key: 'popular', label: '인기순' },
  { key: 'short', label: '짧은 순' },
];
const sorters: Record<SortKey, (a: CourseSummary, b: CourseSummary) => number> = {
  near: (a, b) => (a.startDistanceM ?? 0) - (b.startDistanceM ?? 0),
  popular: (a, b) => b.weeklyRunnerCount - a.weeklyRunnerCount,
  short: (a, b) => a.distanceM - b.distanceM,
};

export function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const scenario = parseScenario(params.scenario);

  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<SortKey>('near');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<'selection' | 'user'>('selection');

  const { state, position } = useNearbyCourses(scenario, radiusM);
  const ready = state.kind === 'ready' ? state.courses : null;
  const locationDenied = state.kind === 'ready' && state.locationDenied;
  const all = useMemo(() => ready ?? [], [ready]);

  const visible = useMemo(() => {
    const active = QUICK_FILTERS.filter((f) => filters[f.key]);
    const q = query.trim();
    return all
      .filter((c) => active.every((f) => f.match(c)) && (q === '' || c.name.includes(q) || c.tags.some((t) => t.includes(q))))
      .sort(sorters[sort]);
  }, [all, filters, query, sort]);

  const weeklyRunners = all.reduce((n, c) => n + c.weeklyRunnerCount, 0);
  const topId = all.reduce<CourseSummary | null>((top, c) => (!top || c.weeklyRunnerCount > top.weeklyRunnerCount ? c : top), null)?.id;

  // 선택이 목록에서 사라지면 첫 코스를 선택한다
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const mapHeight = Math.round(windowHeight * MAP_RATIO);
  const topObscured = insets.top + spacing.sm + TOP_BAR_HEIGHT;
  const bottomObscured = SHEET_OVERLAP + (selected ? TICKET_HEIGHT + spacing.md : 0);

  const openDetail = (c: CourseSummary) => router.push({ pathname: '/course/[id]', params: { id: c.id, name: c.name } });
  const select = (id: string) => {
    setSelectedId(id);
    setFocus('selection');
  };
  const onPressCard = (c: CourseSummary) => (selected?.id === c.id ? openDetail(c) : select(c.id));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      <View style={{ height: mapHeight }}>
        <ExploreMap
          courses={visible}
          selectedId={selected?.id ?? null}
          onSelectCourse={select}
          userPosition={position}
          fallbackCenter={DEFAULT_REGION_CENTER}
          focus={focus}
          base={MOCK_MAP_BASE}
          loading={state.kind === 'locating' || state.kind === 'loading'}
          height={mapHeight}
          obscured={{ top: topObscured, bottom: bottomObscured }}
        />

        <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
          {searching ? (
            <AppSurface level="elevated" radius="pill" style={styles.search}>
              <AppIcon name="search" size={18} color={colors.text.primary} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="코스 이름, 태그 검색"
                placeholderTextColor={colors.text.secondary}
                accessibilityLabel="코스 검색"
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text.primary }]}
              />
              <AppPressable
                onPress={() => {
                  setQuery('');
                  setSearching(false);
                }}
                accessibilityLabel="검색 닫기"
                style={styles.searchClose}
              >
                <AppIcon name="close" size={18} color={colors.text.secondary} />
              </AppPressable>
            </AppSurface>
          ) : (
            <>
              {state.kind === 'ready' && all.length > 0 ? (
                <RunnerPulse count={weeklyRunners} area={locationDenied ? '수성구' : '내 주변'} />
              ) : (
                <View />
              )}
              <AppPressable
                onPress={() => setSearching(true)}
                accessibilityLabel="코스 검색"
                style={[styles.roundButton, { backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay }]}
              >
                <AppIcon name="search" size={20} color={colors.text.primary} />
              </AppPressable>
            </>
          )}
        </View>

        {position ? (
          <AppPressable
            onPress={() => setFocus('user')}
            accessibilityLabel="내 위치로 이동"
            accessibilityState={{ selected: focus === 'user' }}
            style={[
              styles.roundButton,
              styles.locate,
              {
                bottom: bottomObscured + spacing.sm,
                backgroundColor: focus === 'user' ? colors.action.secondary : colors.bg.elevated,
                boxShadow: elevation.mapOverlay,
              },
            ]}
          >
            <AppIcon name="gpsGood" size={20} color={focus === 'user' ? colors.action.onSecondary : colors.text.primary} />
          </AppPressable>
        ) : null}

        {selected ? (
          <CourseTicket course={selected} popular={selected.id === topId} bottom={SHEET_OVERLAP + spacing.md} onOpen={() => openDetail(selected)} />
        ) : null}
      </View>

      <AppSurface level="elevated" style={[styles.sheet, { marginTop: -SHEET_OVERLAP, boxShadow: elevation.sheet }]}>
        <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
        <SheetBody
          state={state}
          all={all}
          visible={visible}
          locationDenied={locationDenied}
          selectedId={selected?.id ?? null}
          radiusM={radiusM}
          sort={sort}
          onSort={setSort}
          filters={filters}
          onToggleFilter={(key) => setFilters((s) => ({ ...s, [key]: !s[key] }))}
          onPressCard={onPressCard}
          onWiden={() => setRadiusM(WIDE_RADIUS_M)}
          onClearFilters={() => {
            setFilters({});
            setQuery('');
          }}
        />
      </AppSurface>
    </View>
  );
}

// 지도 위 첫 문장: 이번 주 이 동네에서 몇 명이 달렸는지 (64.1장 사회적 신호). 서비스명 '달리모'(달리러 모여)를 문장으로 풀었다.
// 검정 알약 + 브랜드 심볼.
function RunnerPulse({ count, area }: { count: number; area: string }) {
  return (
    <ThemeProvider scheme="dark">
      <RunnerPulseBody count={count} area={area} />
    </ThemeProvider>
  );
}

function RunnerPulseBody({ count, area }: { count: number; area: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`이번 주 ${area}에서 ${count}명이 달리러 모였어요`}
      style={[styles.pulse, { backgroundColor: colors.bg.canvas, boxShadow: elevation.mapOverlay }]}
    >
      <BrandSymbol size={22} />
      <AppText role="label" style={styles.pulseText} numberOfLines={1}>
        이번 주{' '}
        <AppText role="label" tone="accent" tabular style={styles.pulseCount}>
          {formatCount(count)}명
        </AppText>
        이 달리러 모였어요
      </AppText>
    </View>
  );
}

// 선택 코스 티켓. 거리·시간과 함께 "1위 기록 / 내 PB"를 보여 도전하고 싶게 만든다 (62장 PB/Rival, 64.1장 Competition-aware).
// 밝은 지도 위에서 가장 먼저 읽히도록 검정(dark 컨텍스트) 표면을 쓴다.
function CourseTicket({ course, popular, bottom, onOpen }: { course: CourseSummary; popular: boolean; bottom: number; onOpen: () => void }) {
  return (
    <ThemeProvider scheme="dark">
      <CourseTicketBody course={course} popular={popular} bottom={bottom} onOpen={onOpen} />
    </ThemeProvider>
  );
}

function CourseTicketBody({ course, popular, bottom, onOpen }: { course: CourseSummary; popular: boolean; bottom: number; onOpen: () => void }) {
  const { colors } = useTheme();
  const gapToLeader = course.myBestSec != null && course.leaderSec != null ? course.myBestSec - course.leaderSec : null;

  return (
    <View style={[styles.ticket, { bottom, height: TICKET_HEIGHT, backgroundColor: colors.bg.canvas, boxShadow: elevation.mapOverlay }]}>
      <View style={styles.ticketHead}>
        <AppText role="sectionTitle" numberOfLines={1} style={styles.ticketName}>
          {course.name}
        </AppText>
        {popular ? (
          <View style={[styles.hot, { backgroundColor: colors.action.primary }]}>
            <AppText role="caption" style={[styles.hotText, { color: colors.action.onPrimary }]}>
              이번 주 인기
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.ticketStats}>
        <BigStat value={formatDistanceKm(course.distanceM, 1)} unit="km" />
        <BigStat value={`${Math.round(course.estimatedSec / 60)}`} unit="분" />
        <BigStat value={formatCount(course.weeklyRunnerCount)} unit="명 달림" />
      </View>

      <View style={styles.ticketFoot}>
        <View style={styles.records}>
          <View style={styles.recordRow}>
            <AppIcon name="finished" size={13} color={colors.text.secondary} />
            <AppText role="caption" tone="secondary">
              코스 1위
            </AppText>
            <AppText role="caption" tabular style={styles.recordValue}>
              {course.leaderSec != null ? formatDuration(course.leaderSec) : '기록 없음'}
            </AppText>
          </View>
          <View style={styles.recordRow}>
            <AppIcon name="running" size={13} color={colors.text.secondary} />
            <AppText role="caption" tone="secondary">
              내 PB
            </AppText>
            {course.myBestSec != null ? (
              <>
                <AppText role="caption" tabular tone="accent" style={styles.recordValue}>
                  {formatDuration(course.myBestSec)}
                </AppText>
                {gapToLeader != null && gapToLeader > 0 ? (
                  <AppText role="caption" tone="secondary" tabular>
                    1위까지 {formatDuration(gapToLeader)}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText role="caption" tone="accent" style={styles.recordValue}>
                첫 기록에 도전
              </AppText>
            )}
          </View>
        </View>
        <AppPressable
          onPress={onOpen}
          accessibilityLabel={`${course.name} 코스 보기`}
          hitSlop={(touchTarget.min - CTA_HEIGHT) / 2}
          style={({ pressed }) => [styles.cta, { backgroundColor: pressed ? colors.action.primaryPressed : colors.action.primary }]}
          feedback="none"
        >
          <AppText role="label" style={[styles.ctaText, { color: colors.action.onPrimary }]}>
            코스 보기
          </AppText>
        </AppPressable>
      </View>
    </View>
  );
}

function BigStat({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.bigStat}>
      <AppText role="metricLarge" tabular style={styles.bigStatValue} numberOfLines={1}>
        {value}
      </AppText>
      <AppText role="label" tone="secondary">
        {unit}
      </AppText>
    </View>
  );
}

function SheetBody({
  state,
  all,
  visible,
  locationDenied,
  selectedId,
  radiusM,
  sort,
  onSort,
  filters,
  onToggleFilter,
  onPressCard,
  onWiden,
  onClearFilters,
}: {
  state: ReturnType<typeof useNearbyCourses>['state'];
  all: CourseSummary[];
  visible: CourseSummary[];
  locationDenied: boolean;
  selectedId: string | null;
  radiusM: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  filters: Record<string, boolean>;
  onToggleFilter: (key: string) => void;
  onPressCard: (c: CourseSummary) => void;
  onWiden: () => void;
  onClearFilters: () => void;
}) {
  if (state.kind === 'locating' || state.kind === 'loading') {
    return (
      <View accessibilityLabel="주변 코스 불러오는 중">
        <SheetHeader title="내 주변 코스" />
        <CourseCard loading title="" distanceM={0} />
        <CourseCard loading title="" distanceM={0} />
        <CourseCard loading title="" distanceM={0} />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <StateNotice
        icon="disconnected"
        tone="danger"
        title="코스를 불러오지 못했어요"
        body="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
        actions={<SecondaryButton label="다시 시도" size="sm" onPress={state.retry} />}
      />
    );
  }

  if (all.length === 0) {
    return (
      <StateNotice
        icon="search"
        title={`${formatDistanceKm(radiusM, 0)}km 안에 등록된 코스가 없어요`}
        body={radiusM < WIDE_RADIUS_M ? '범위를 넓히거나 다른 지역에서 찾아보세요.' : '다른 지역을 검색해 보세요.'}
        actions={
          radiusM < WIDE_RADIUS_M ? (
            <SecondaryButton label={`${formatDistanceKm(WIDE_RADIUS_M, 0)}km까지 넓히기`} size="sm" onPress={onWiden} />
          ) : undefined
        }
      />
    );
  }

  const sorts = SORTS.filter((s) => !(locationDenied && s.key === 'near'));
  const current = sorts.find((s) => s.key === sort) ?? sorts[0];
  const nextSort = () => onSort(sorts[(sorts.indexOf(current) + 1) % sorts.length].key);

  const header = (
    <>
      {locationDenied ? (
        <StateNotice
          icon="gpsUnavailable"
          tone="warning"
          title="위치 권한이 꺼져 있어요"
          body="내 주변 코스 대신 기본 지역 코스를 보여드려요. 지역이나 코스 이름으로도 찾을 수 있어요."
          actions={<SecondaryButton label="설정에서 권한 켜기" size="sm" onPress={() => Linking.openSettings()} />}
        />
      ) : null}
      <SheetHeader
        title={locationDenied ? '대구 수성구 코스' : '내 주변 코스'}
        count={visible.length}
        right={
          <AppPressable onPress={nextSort} accessibilityLabel={`정렬: ${current.label}. 눌러서 바꾸기`} style={styles.sortButton}>
            <AppText role="label" style={styles.sortText}>
              {current.label}
            </AppText>
            <AppIcon name="swap" size={14} />
          </AppPressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {QUICK_FILTERS.map((f) => (
          <FilterChip key={f.key} label={f.label} selected={!!filters[f.key]} onPress={() => onToggleFilter(f.key)} />
        ))}
      </ScrollView>
    </>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <AppDivider inset="lg" />}
      ListEmptyComponent={
        <StateNotice
          icon="noData"
          title="조건에 맞는 코스가 없어요"
          body="필터나 검색어를 바꿔 보세요."
          actions={<SecondaryButton label="필터 초기화" size="sm" onPress={onClearFilters} />}
        />
      }
      renderItem={({ item }) => (
        <CourseCard
          title={item.name}
          distanceM={item.distanceM}
          tags={item.tags}
          route={item.displayRoute}
          socialContext={`이번 주 ${formatCount(item.weeklyRunnerCount)}명`}
          proximityM={locationDenied ? undefined : (item.startDistanceM ?? undefined)}
          recordContext={item.myBestSec != null ? `내 PB ${formatDuration(item.myBestSec)}` : item.leaderSec != null ? `1위 ${formatDuration(item.leaderSec)}` : undefined}
          selected={item.id === selectedId}
          onPress={() => onPressCard(item)}
          accessibilityHint={item.id === selectedId ? '코스 상세로 이동' : '지도에서 이 코스를 표시'}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

function SheetHeader({ title, count, right }: { title: string; count?: number; right?: ReactNode }) {
  return (
    <View style={styles.sheetHeader}>
      <AppText role="sectionTitle" accessibilityRole="header" style={styles.sheetTitle}>
        {title}
      </AppText>
      {count != null ? (
        <AppText role="sectionTitle" tone="accent" tabular style={styles.sheetTitle}>
          {count}
        </AppText>
      ) : null}
      {right ? <View style={styles.sheetRight}>{right}</View> : null}
    </View>
  );
}

const CTA_HEIGHT = 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pulse: {
    height: TOP_BAR_HEIGHT - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  pulseText: {
    fontFamily: fontFamily.bold,
  },
  pulseCount: {
    fontFamily: fontFamily.extrabold,
  },
  roundButton: {
    width: TOP_BAR_HEIGHT,
    height: TOP_BAR_HEIGHT,
    minHeight: TOP_BAR_HEIGHT,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flex: 1,
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    boxShadow: elevation.mapOverlay,
  },
  searchInput: {
    flex: 1,
    height: TOP_BAR_HEIGHT,
    fontFamily: fontFamily.medium,
    fontSize: typography.body.fontSize,
  },
  searchClose: {
    width: TOP_BAR_HEIGHT,
    alignItems: 'center',
  },
  locate: {
    position: 'absolute',
    right: spacing.lg,
  },
  ticket: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + spacing.xs,
    justifyContent: 'space-between',
  },
  ticketHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketName: {
    flexShrink: 1,
    fontFamily: fontFamily.extrabold,
  },
  hot: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  hotText: {
    fontFamily: fontFamily.extrabold,
  },
  ticketStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.lg + spacing.xs,
  },
  bigStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  bigStatValue: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  ticketFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  records: {
    flex: 1,
    gap: 2,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordValue: {
    fontFamily: fontFamily.extrabold,
  },
  cta: {
    minHeight: CTA_HEIGHT,
    paddingHorizontal: spacing.lg + spacing.xs,
    borderRadius: radius.pill,
  },
  ctaText: {
    fontFamily: fontFamily.extrabold,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: spacing.huge - spacing.xs,
    height: spacing.xs + 1,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 28,
  },
  sheetRight: {
    marginLeft: 'auto',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
  },
  sortText: {
    fontFamily: fontFamily.bold,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
