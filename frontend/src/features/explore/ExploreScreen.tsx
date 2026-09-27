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
import { elevation, fontFamily, radius, spacing, touchTarget, typography } from '@/design/tokens';
import { formatDistanceKm, formatDuration } from '@/shared/format';

import { parseScenario } from './api/scenario';
import { ExploreMap } from './components/ExploreMap';
import { StateNotice } from './components/StateNotice';
import { useNearbyCourses } from './useNearbyCourses';

// SCR-E01 Explore 홈 (CRS-001 주변 코스, CRS-004 빠른 필터, LOC-001/002 위치 권한).
// 89장: 밝은 지도 55~65% + 하단 코스 결과, 상단 검색은 지도 위 고정, 선택 코스가 route signal로 강조.
// 74장 필수 상태: loading, location denied, no nearby course, network error, map ready, list ready.

const DEFAULT_RADIUS_M = 3000;
const WIDE_RADIUS_M = 10000;
const MAP_RATIO = 0.58;
const SHEET_OVERLAP = spacing.xxl;
const CHIP_HEIGHT = 36;
const PILL_SPACE = touchTarget.min + spacing.md;

type QuickFilter = { key: string; label: string; match: (c: CourseSummary) => boolean };

const QUICK_FILTERS: QuickFilter[] = [
  { key: 'short', label: '3~5km', match: (c) => c.distanceM >= 3000 && c.distanceM <= 5000 },
  { key: 'flat', label: '평지', match: (c) => c.tags.includes('평지') },
  { key: 'night', label: '야간 밝음', match: (c) => c.tags.includes('야간 밝음') },
  { key: 'easy', label: '초보 추천', match: (c) => c.tags.includes('초보 추천') },
];

export function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const scenario = parseScenario(params.scenario);

  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { state, position } = useNearbyCourses(scenario, radiusM);
  const ready = state.kind === 'ready' ? state.courses : null;
  const locationDenied = state.kind === 'ready' && state.locationDenied;
  const all = useMemo(() => ready ?? [], [ready]);

  const visible = useMemo(() => {
    const active = QUICK_FILTERS.filter((f) => filters[f.key]);
    const q = query.trim();
    return all.filter(
      (c) => active.every((f) => f.match(c)) && (q === '' || c.name.includes(q) || c.tags.some((t) => t.includes(q))),
    );
  }, [all, filters, query]);

  // 선택이 목록에서 사라지면 가장 가까운 코스를 선택한다
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const mapHeight = Math.round(windowHeight * MAP_RATIO);
  const openDetail = (c: CourseSummary) => router.push({ pathname: '/course/[id]', params: { id: c.id, name: c.name } });

  const onPressCard = (c: CourseSummary) => {
    if (selected?.id === c.id) openDetail(c);
    else setSelectedId(c.id);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      <View style={{ height: mapHeight }}>
        <ExploreMap
          courses={visible}
          selectedId={selected?.id ?? null}
          onSelectCourse={setSelectedId}
          userPosition={position}
          loading={state.kind === 'locating' || state.kind === 'loading'}
          height={mapHeight}
          obscured={{
            top: insets.top + spacing.sm + touchTarget.min + spacing.sm + CHIP_HEIGHT,
            bottom: SHEET_OVERLAP + PILL_SPACE,
          }}
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
              />
            ))}
          </ScrollView>
        </View>
        {selected ? (
          <AppPressable
            onPress={() => openDetail(selected)}
            accessibilityLabel={`${selected.name} 자세히 보기`}
            style={[styles.openPill, { bottom: SHEET_OVERLAP + spacing.md, backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay }]}
          >
            <View style={styles.openPillRow}>
              <AppText role="label" numberOfLines={1} style={styles.openPillName}>
                {selected.name}
              </AppText>
              <AppText role="label" tone="accent">
                자세히 보기
              </AppText>
            </View>
          </AppPressable>
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

function SheetBody({
  state,
  all,
  visible,
  locationDenied,
  selectedId,
  radiusM,
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

  return (
    <FlatList
      data={visible}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        locationDenied ? (
          <>
            <StateNotice
              icon="gpsUnavailable"
              tone="warning"
              title="위치 권한이 꺼져 있어요"
              body="내 주변 코스 대신 기본 지역 코스를 보여드려요. 지역이나 코스 이름으로도 찾을 수 있어요."
              actions={<SecondaryButton label="설정에서 권한 켜기" size="sm" onPress={() => Linking.openSettings()} />}
            />
            <SheetHeader title="대구 수성구 코스" count={visible.length} />
          </>
        ) : (
          <SheetHeader title="내 주변 코스" count={visible.length} sub={`${formatDistanceKm(radiusM, 0)}km 안 · 가까운 순`} />
        )
      }
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
      <View style={styles.sheetTitle}>
        <AppText role="sectionTitle" accessibilityRole="header">
          {title}
        </AppText>
        {count != null ? (
          <AppText role="label" tone="secondary" tabular>
            {count}개
          </AppText>
        ) : null}
      </View>
      {sub ? (
        <AppText role="caption" tone="secondary">
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
  },
  openPill: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    maxWidth: '86%',
  },
  openPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  openPillName: {
    flexShrink: 1,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.xs / 2,
  },
  sheetTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
