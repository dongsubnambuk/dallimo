import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { HistoryScenario } from '@/entities/run/api/mockRunResultRepository';
import type { Me } from '@/entities/user/types';
import { DevLinks } from '@/features/dev/DevLinks';
import { GpsPocLink } from '@/features/gps-poc/GpsPocLink';
import { formatCount, formatDistanceKm } from '@/shared/format';

import { LocalOnlyNotice } from './components/LocalOnlyNotice';
import { RunRow } from './components/RunRow';
import { hoursLabel } from './labels';
import { useMe, useRecentRuns } from './useMy';

const RECENT = 3;

// SCR-M01 My (MY-001~003): 프로필, 누적 거리 · 시간 · 횟수, 최근 기록.
// 65장 My: Profile / Runs / Records … 중 이번 단계(72장 11번 My/History)는 프로필 · 통계 · 기록 회고까지.
export function MyScreen({ scenario }: { scenario: HistoryScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe(scenario);
  const recent = useRecentRuns(scenario, RECENT);
  // 탭은 화면을 계속 들고 있으므로 돌아올 때마다 다시 읽어 방금 달린 기록을 반영한다
  const { refetch: refetchMe } = me;
  const { refetch: refetchRecent } = recent;
  useFocusEffect(
    useCallback(() => {
      refetchMe();
      refetchRecent();
    }, [refetchMe, refetchRecent]),
  );
  const openHistory = () => router.push({ pathname: '/my/runs', params: scenario === 'normal' ? {} : { scenario } });

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg.canvas }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.huge }]}
    >
      {me.isPending ? (
        <View style={styles.loader}>
          <BrandLoader size={48} label="내 기록 불러오는 중" />
        </View>
      ) : me.isError ? (
        <StateNotice
          icon="warning"
          tone="warning"
          title="내 정보를 불러오지 못했어요"
          body="연결을 확인하고 다시 시도해 주세요. 휴대폰에 저장된 기록은 지워지지 않아요."
          actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => (me.refetch(), recent.refetch())} />}
        />
      ) : (
        <>
          <Profile me={me.data} />
          <StatsCard me={me.data} />
          {/* SCR-M04 내 코스 */}
          <AppPressable
            onPress={() => router.push('/my/courses')}
            accessibilityRole="button"
            accessibilityLabel="내 코스, 등록 · 저장 · 완주한 코스"
            style={[styles.entry, { backgroundColor: colors.bg.surface }]}
          >
            <AppIcon name="map" size={22} color={colors.text.primary} />
            <View style={styles.flex}>
              <AppText role="body" style={styles.bold}>
                내 코스
              </AppText>
              <AppText role="caption" tone="secondary">
                등록 · 저장 · 완주한 코스
              </AppText>
            </View>
            <AppIcon name="collapse" size={18} color={colors.text.secondary} />
          </AppPressable>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText role="sectionTitle" accessibilityRole="header">
                최근 기록
              </AppText>
              {me.data.stats.runCount > 0 ? (
                <AppPressable onPress={openHistory} accessibilityRole="button" accessibilityLabel={`전체 기록 ${me.data.stats.runCount}개 보기`} style={styles.more}>
                  <AppText role="label" style={styles.bold}>
                    전체 보기
                  </AppText>
                  <AppIcon name="collapse" size={18} color={colors.text.primary} />
                </AppPressable>
              ) : null}
            </View>
            {recent.isPending ? (
              <View style={styles.loaderSmall}>
                <BrandLoader size={32} label="최근 기록 불러오는 중" />
              </View>
            ) : recent.isError ? (
              <SecondaryButton label="최근 기록 다시 불러오기" size="sm" onPress={() => recent.refetch()} style={styles.selfStart} />
            ) : recent.data.items.length === 0 ? (
              <View style={styles.empty}>
                <AppText role="body" tone="secondary">
                  아직 기록이 없어요. 첫 달리기를 기록하면 여기에 쌓여요.
                </AppText>
                <SecondaryButton label="달리기 시작" emphasized size="sm" onPress={() => router.navigate('/run')} style={styles.selfStart} />
              </View>
            ) : (
              <>
                <LocalOnlyNotice count={recent.data.items.filter((r) => r.sync === 'localOnly').length} />
                <View>
                  {recent.data.items.map((r) => (
                    <RunRow key={r.id} run={r} />
                  ))}
                </View>
              </>
            )}
          </View>
        </>
      )}
      <GpsPocLink />
      <DevLinks />
    </ScrollView>
  );
}

function Profile({ me }: { me: Me }) {
  const { colors } = useTheme();
  return (
    <View style={styles.profile}>
      <Avatar nickname={me.profile.nickname} imageUrl={me.profile.profileImageUrl} />
      <AppText role="screenTitle" accessibilityRole="header" numberOfLines={1} style={styles.flex}>
        {me.profile.nickname}
      </AppText>
      {/* SCR-M07 설정 */}
      <AppPressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
        <AppIcon name="settings" size={22} color={colors.text.primary} />
      </AppPressable>
    </View>
  );
}

// 누적 거리 · 시간 · 횟수 (MY-002). 랭킹 내 순위 카드 · 탐색 티켓과 같은 검정 표면에 가장 큰 숫자 하나.
function StatsCard({ me }: { me: Me }) {
  return (
    <ThemeProvider scheme="dark">
      <StatsBody me={me} />
    </ThemeProvider>
  );
}

function StatsBody({ me }: { me: Me }) {
  const { colors } = useTheme();
  const s = me.stats;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.bg.canvas }]}
      accessible
      accessibilityLabel={`누적 거리 ${formatDistanceKm(s.totalDistanceM, 1)}킬로미터, 달린 시간 ${hoursLabel(s.totalActiveSec)}, 러닝 ${formatCount(s.runCount)}회`}
    >
      <AppText role="label" tone="secondary">
        누적 거리
      </AppText>
      <View style={styles.distanceLine}>
        {/* 기록이 없으면 0을 민트로 강조하지 않는다 */}
        <AppText role="metricHero" tone={s.runCount > 0 ? 'accent' : 'secondary'} tabular numberOfLines={1} adjustsFontSizeToFit style={styles.flexShrink}>
          {formatDistanceKm(s.totalDistanceM, 1)}
        </AppText>
        <AppText role="sectionTitle" tone="secondary">
          km
        </AppText>
      </View>
      <View style={[styles.cardRow, { borderTopColor: colors.border.subtle }]}>
        <View style={styles.flex}>
          <AppText role="label" tone="secondary">
            달린 시간
          </AppText>
          <AppText role="sectionTitle" tabular style={styles.bold}>
            {hoursLabel(s.totalActiveSec)}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText role="label" tone="secondary">
            러닝
          </AppText>
          <AppText role="sectionTitle" tabular style={styles.bold}>
            {formatCount(s.runCount)}회
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  loader: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  loaderSmall: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  distanceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  entry: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  more: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: spacing.md,
  },
  empty: {
    gap: spacing.md,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
