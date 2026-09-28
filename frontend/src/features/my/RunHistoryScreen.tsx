import { router } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import type { HistoryScenario } from '@/entities/run/api/mockRunResultRepository';
import type { RunSummary } from '@/entities/run/history';

import { LocalOnlyNotice } from './components/LocalOnlyNotice';
import { RunRow } from './components/RunRow';
import { monthKey, monthLabel, startedAt } from './labels';
import { useRunHistory } from './useMy';

type Section = { key: string; title: string; data: RunSummary[] };

// SCR-M02 러닝 히스토리 (MY-003). 73장 "기록을 시간 순으로 찾고 Run Detail로 이동".
// 최근 기록부터 월별로 묶고, 긴 목록은 가상화된 SectionList + cursor로 이어 받는다 (CLAUDE.md 9항).
export function RunHistoryScreen({ scenario }: { scenario: HistoryScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { list, items } = useRunHistory(scenario);
  const sections = useMemo(() => groupByMonth(items), [items]);
  const localOnly = items.filter((r) => r.sync === 'localOnly').length;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          러닝 기록
        </AppText>
      </View>

      {list.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="러닝 기록 불러오는 중" />
        </View>
      ) : list.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="기록을 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요. 휴대폰에 저장된 기록은 지워지지 않아요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RunRow run={item} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHead, { backgroundColor: colors.bg.canvas }]}>
              <AppText role="sectionTitle" accessibilityRole="header">
                {section.title}
              </AppText>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxl }]}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={localOnly > 0 ? <View style={styles.notice}><LocalOnlyNotice count={localOnly} /></View> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText role="body" tone="secondary">
                아직 기록이 없어요. 첫 달리기를 기록하면 여기에 쌓여요.
              </AppText>
              <SecondaryButton label="달리기 시작" emphasized size="sm" onPress={() => router.navigate('/run')} style={styles.selfStart} />
            </View>
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.footer}>
                <BrandLoader size={28} label="기록 더 불러오는 중" />
              </View>
            ) : items.length > 0 && !list.hasNextPage ? (
              <AppText role="caption" tone="secondary" style={styles.end}>
                첫 기록까지 모두 봤어요
              </AppText>
            ) : null
          }
        />
      )}
    </View>
  );
}

function groupByMonth(items: RunSummary[]): Section[] {
  const now = new Date();
  const sections: Section[] = [];
  for (const r of items) {
    const d = startedAt(r);
    const key = monthKey(d);
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push(r);
    else sections.push({ key, title: monthLabel(d, now), data: [r] });
  }
  return sections;
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
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  notice: {
    paddingTop: spacing.sm,
  },
  sectionHead: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  empty: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  end: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
