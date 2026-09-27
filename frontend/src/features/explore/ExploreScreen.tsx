import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCard } from '@/components/CourseCard';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { CourseSummary } from '@/entities/course/types';
import { AppDivider, AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
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
// 레퍼런스(REFERENCE-RESEARCH-2026-09.md): 지도 위 경로·출발 표시(P1), 코스 위 러너 수(고스트러너), 선택 코스 요약 카드(AllTrails·Runnect),
// 목록 경로 모양(P7), 기울임 숫자(P4), 정렬(Runnect), 내 위치 버튼.

const DEFAULT_RADIUS_M = 3000;
const WIDE_RADIUS_M = 10000;
const MAP_RATIO = 0.6;
const SHEET_OVERLAP = spacing.xxl;
const CHIP_HEIGHT = 36;
const SELECTED_CARD_HEIGHT = 76;

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

  // 선택이 목록에서 사라지면 첫 코스를 선택한다
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const mapHeight = Math.round(windowHeight * MAP_RATIO);
  const topObscured = insets.top + spacing.sm + touchTarget.min + spacing.sm + CHIP_HEIGHT;
  const bottomObscured = SHEET_OVERLAP + (selected ? SELECTED_CARD_HEIGHT + spacing.md : 0);

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

        <View style={[styles.overlay, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <AppSurface level="elevated" radius="control" style={styles.search}>
            <AppIcon name="search" size={18} color={colors.text.secondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="지역, 장소, 코스 이름"
              placeholderTextColor={colors.text.secondary}
              accessibilityLabel="코스 검색"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text.primary }]}
            />
          </AppSurface>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {QUICK_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                selected={!!filters[f.key]}
                onPress={() => setFilters((s) => ({ ...s, [f.key]: !s[f.key] }))}
                style={{ boxShadow: elevation.mapOverlay }}
              />
            ))}
          </ScrollView>
        </View>

        {position ? (
          <AppPressable
            onPress={() => setFocus('user')}
            accessibilityLabel="내 위치로 이동"
            style={[
              styles.locate,
              { bottom: bottomObscured + spacing.sm, backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay },
            ]}
          >
            <AppIcon name="gpsGood" size={20} color={focus === 'user' ? colors.action.primary : colors.text.primary} />
          </AppPressable>
        ) : null}

        {selected ? (
          <SelectedCourseCard course={selected} bottom={SHEET_OVERLAP + spacing.md} onOpen={() => openDetail(selected)} />
        ) : null}
      </View>

      <AppSurface level="surface" style={[styles.sheet, { marginTop: -SHEET_OVERLAP, boxShadow: elevation.sheet }]}>
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

// 선택 코스 요약 (AllTrails·Runnect의 지도 위 코스 카드). 89장: 지도보다 커지지 않게 한 줄 요약만.
function SelectedCourseCard({ course, bottom, onOpen }: { course: CourseSummary; bottom: number; onOpen: () => void }) {
  const { colors } = useTheme();
  return (
    <AppSurface
      level="elevated"
      radius="card"
      style={[styles.selectedCard, { bottom, height: SELECTED_CARD_HEIGHT, boxShadow: elevation.mapOverlay }]}
    >
      <View style={styles.selectedBody}>
        <AppText role="sectionTitle" numberOfLines={1}>
          {course.name}
        </AppText>
        <View style={styles.selectedStats}>
          <Stat value={formatDistanceKm(course.distanceM, 1)} unit="km" />
          <Stat value={`${Math.round(course.estimatedSec / 60)}`} unit="분" />
          <View style={styles.inlineRow}>
            <AppIcon name="running" size={13} color={colors.text.secondary} />
            <AppText role="caption" tone="secondary" tabular>
              이번 주 {formatCount(course.weeklyRunnerCount)}명
            </AppText>
          </View>
        </View>
      </View>
      <SecondaryButton label="코스 보기" size="sm" emphasized onPress={onOpen} />
    </AppSurface>
  );
}

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.inlineRow}>
      <AppText role="label" tabular style={styles.statValue}>
        {value}
      </AppText>
      <AppText role="caption" tone="secondary">
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
        sub={locationDenied ? undefined : `${formatDistanceKm(radiusM, 0)}km 안`}
      />
      <View style={styles.sorts} accessibilityRole="tablist">
        {SORTS.filter((s) => !(locationDenied && s.key === 'near')).map((s) => (
          <AppPressable
            key={s.key}
            onPress={() => onSort(s.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: sort === s.key }}
          >
            <AppText role="label" tone={sort === s.key ? 'primary' : 'secondary'} style={sort === s.key && styles.sortActive}>
              {s.label}
            </AppText>
          </AppPressable>
        ))}
      </View>
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
          recordContext={item.myBestSec != null ? `내 PB ${formatDuration(item.myBestSec)}` : undefined}
          selected={item.id === selectedId}
          onPress={() => onPressCard(item)}
          accessibilityHint={item.id === selectedId ? '코스 상세로 이동' : '지도에서 이 코스를 표시'}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

function SheetHeader({ title, count, sub }: { title: string; count?: number; sub?: string }) {
  return (
    <View style={styles.sheetHeader}>
      <AppText role="sectionTitle" accessibilityRole="header">
        {title}
      </AppText>
      {count != null ? (
        <AppText role="label" tone="accent" tabular>
          {count}
        </AppText>
      ) : null}
      {sub ? (
        <AppText role="caption" tone="secondary" style={styles.sheetSub}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
  },
  search: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    boxShadow: elevation.mapOverlay,
  },
  searchInput: {
    flex: 1,
    minHeight: touchTarget.min,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  locate: {
    position: 'absolute',
    right: spacing.lg,
    width: touchTarget.min,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  selectedCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  selectedBody: {
    flex: 1,
    gap: spacing.xs,
  },
  selectedStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs / 2,
  },
  statValue: {
    fontFamily: fontFamily.extrabold,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: spacing.huge,
    height: spacing.xs,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetSub: {
    marginLeft: 'auto',
  },
  sorts: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sortActive: {
    fontFamily: fontFamily.semibold,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
