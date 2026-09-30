import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { RankingRow } from '@/components/RankingRow';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { getCourseRepository } from '@/entities/course/api';
import { getShareRepository } from '@/entities/share/api';
import type { CourseDetail, CourseDifficulty, Level } from '@/entities/course/types';
import { AppDivider, AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, OBLIQUE_SKEW, radius, spacing, touchTarget, typography } from '@/design/tokens';
import { formatCount, formatDistanceKm } from '@/shared/format';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';
import { CourseTitlesCard } from '@/features/ranking/components/CourseTitlesCard';
import { useCourseTitles } from '@/features/ranking/useCourseTitles';

import { CompetitionCard } from './components/CompetitionCard';
import { CourseRouteMap } from './components/CourseRouteMap';
import { ReviewsSection } from './components/ReviewsSection';
import { ElevationProfile } from '@/components/ElevationProfile';
import type { CourseScenario } from './scenario';
import { useCourseDetail } from './useCourseDetail';

// SCR-E03 코스 상세 (CRS-101 코스 정보, CRS-102 러닝 환경, CRS-103 내 기록, CRS-104 랭킹 미리보기,
// CRS-105 저장, CRS-106 코스 러닝 시작, CRS-107 공유).
// 61.1장 정보 계층: 1차 지도·거리·예상 시간·난이도·시작 지점·RUN CTA → 2차 내 PB·친구·주간 순위 →
// 3차 고도·환경 → 4차 설명·추천 시간·만든 사람. 91장 배치, RUN CTA는 하단 고정(89장).
// 74장 필수 상태: loading, private/hidden, no record, has PB, verification info unavailable.

const MAP_RATIO = 0.36;
const SHEET_OVERLAP = spacing.xxl;
const HEADER_BUTTON = 44;

export function CourseDetailScreen({ id, scenario }: { id: string; scenario: CourseScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const state = useCourseDetail(id, scenario);
  const mapHeight = Math.round(windowHeight * MAP_RATIO);
  const course = state.kind === 'ready' ? state.course : null;
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const saved = bookmarked ?? course?.bookmarked ?? false;
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const queryClient = useQueryClient();
  // CRS-105 저장 · 저장 해제. 바로 바꿔 보여주고 실패하면 되돌린다
  const toggleBookmark = (c: CourseDetail) => {
    const next = !saved;
    setBookmarked(next);
    repo
      .setBookmark(c.id, next)
      .then(() => queryClient.invalidateQueries({ queryKey: ['course', 'mine'] }))
      .catch(() => setBookmarked(!next));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <View style={[styles.header, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <RoundButton icon="back" label="뒤로" onPress={goBack} />
      {course ? (
        <View style={styles.headerRight}>
          {/* CRS-105 코스 저장 */}
          <RoundButton
            icon={saved ? 'bookmarked' : 'bookmark'}
            label={saved ? '저장 취소' : '코스 저장'}
            selected={saved}
            onPress={() => toggleBookmark(course)}
          />
          <RoundButton icon="share" label="코스 공유" onPress={() => shareCourse(course)} />
        </View>
      ) : null}
    </View>
  );

  if (state.kind === 'hidden' || state.kind === 'error') {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + HEADER_BUTTON + spacing.xxl }]}>
        {header}
        {state.kind === 'hidden' ? (
          <StateNotice
            icon="unverified"
            title="볼 수 없는 코스예요"
            body="만든 사람이 비공개로 바꿨거나 운영 정책에 따라 숨겨진 코스예요. 내 기록은 기록 탭에서 계속 볼 수 있어요."
            actions={<SecondaryButton label="다른 코스 찾기" size="sm" emphasized onPress={() => router.replace('/')} />}
          />
        ) : (
          <StateNotice
            icon="disconnected"
            tone="danger"
            title="코스 정보를 불러오지 못했어요"
            body="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={state.retry} />}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: CTA_BAR + insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <CourseRouteMap
          route={course?.route ?? null}
          base={MOCK_MAP_BASE}
          height={mapHeight}
          obscured={{ top: insets.top + spacing.sm + HEADER_BUTTON, bottom: SHEET_OVERLAP }}
          accessibilityLabel={course ? `${course.name} 경로 지도, ${formatDistanceKm(course.distanceM, 1)}킬로미터` : undefined}
        />
        <View style={[styles.sheet, { backgroundColor: colors.bg.canvas, marginTop: -SHEET_OVERLAP }]}>
          {course ? <CourseBody course={course} onRetryRanking={state.kind === 'ready' ? state.refetch : undefined} /> : <BodySkeleton />}
        </View>
      </ScrollView>

      {header}

      {course ? (
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.bg.elevated, borderTopColor: colors.border.subtle }]}>
          {/* CRS-106: 코스 러닝 시작 → 플레이 방식 선택 sheet (64장 PICK A PLAY MODE) */}
          <PrimaryRunButton
            label="이 코스 달리기"
            onPress={() => router.push({ pathname: '/course/[id]/play', params: { id: course.id, ...(scenario !== 'normal' ? { scenario } : {}) } })}
          />
        </View>
      ) : null}
    </View>
  );
}

function CourseBody({ course, onRetryRanking }: { course: CourseDetail; onRetryRanking?: () => void }) {
  const { colors } = useTheme();
  const comp = course.competition;
  const showMe = comp?.myEntry && comp.myEntry.rank > comp.weeklyTop.length;

  return (
    <>
      {/* 1차: 코스가 어떤 곳인지 */}
      <View style={styles.titleBlock}>
        <AppText role="label" tone="secondary" numberOfLines={1}>
          {/* 6.3장 CourseStatus NEW: 막 등록되어 아직 완주 기록이 없는 코스 */}
          {[course.status === 'NEW' ? '새 코스' : null, course.region, ...course.tags].filter(Boolean).join(' · ')}
        </AppText>
        <AppText role="screenTitle" accessibilityRole="header">
          {course.name}
        </AppText>
      </View>
      <View style={styles.stats}>
        <BigStat label="거리" value={formatDistanceKm(course.distanceM, 1)} unit="km" />
        <BigStat label="예상 시간" value={`${Math.round(course.estimatedSec / 60)}`} unit="분" />
        <BigStat label="난이도" value={difficultyLabel(course.difficulty)} plain />
        <BigStat label="오르막" value={course.elevationGainM != null ? `+${course.elevationGainM}` : '--'} unit="m" />
      </View>

      {/* 2차: 내가 왜 달려야 하는지 */}
      <View style={styles.section}>
        <CompetitionCard course={course} />
      </View>

      {/* 124장 코스 크라운 · 로컬 레전드 */}
      <CourseTitlesSection courseId={course.id} />

      <Section title="이번 주 랭킹" note="인증된 기록만 반영돼요">
        {comp ? (
          comp.weeklyTop.length > 0 ? (
            <View>
              {comp.weeklyTop.map((e) => (
                <RankingRow key={e.rank} rank={e.rank} name={e.name} timeSec={e.timeSec} paceSecPerKm={e.paceSecPerKm} relation={e.relation} />
              ))}
              {showMe && comp.myEntry ? (
                <>
                  <View style={styles.gapDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <AppText role="caption" tone="secondary">
                      ⋯
                    </AppText>
                  </View>
                  <RankingRow
                    rank={comp.myEntry.rank}
                    name={comp.myEntry.name}
                    timeSec={comp.myEntry.timeSec}
                    paceSecPerKm={comp.myEntry.paceSecPerKm}
                    relation="self"
                    isPB={comp.myEntry.isPB}
                  />
                </>
              ) : null}
              <SecondaryButton
                label="전체 랭킹 보기"
                size="sm"
                onPress={() => router.push({ pathname: '/course/[id]/ranking', params: { id: course.id } })}
                style={styles.rankingLink}
              />
            </View>
          ) : (
            <AppText role="body" tone="secondary">
              이번 주 인증 기록이 아직 없어요. 첫 기록이 1위가 돼요.
            </AppText>
          )
        ) : (
          <StateNotice
            icon="pending"
            tone="warning"
            title="랭킹을 불러오지 못했어요"
            body="기록 인증 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요."
            actions={onRetryRanking ? <SecondaryButton label="다시 시도" size="sm" onPress={onRetryRanking} /> : undefined}
          />
        )}
      </Section>

      {/* 3차: 판단 보조 */}
      {course.elevationProfile ? (
        <Section title="고도">
          <ElevationProfile profile={course.elevationProfile} gainM={course.elevationGainM} />
        </Section>
      ) : null}

      <Section title="러닝 환경" note={course.rating.count > 0 ? '완주자 평가 기준' : undefined}>
        <View style={styles.envGrid}>
          <EnvItem icon="signals" label="신호" value={levelLabel(course.environment.signals, ['적음', '보통', '많음'])} />
          <EnvItem icon="nightLight" label="야간 조명" value={levelLabel(course.environment.nightLight, ['어두움', '보통', '밝음'])} />
          <EnvItem icon="crowd" label="혼잡" value={levelLabel(course.environment.crowd, ['한적함', '보통', '붐빔'])} />
          <EnvItem icon="surface" label="노면" value={course.environment.surface ?? '정보 없음'} />
          <EnvItem icon="toilet" label="화장실" value={presenceLabel(course.environment.toilets)} />
          <EnvItem icon="water" label="급수대" value={presenceLabel(course.environment.waterFountains)} />
        </View>
      </Section>

      {/* 4차: 설명·추천 시간·만든 사람 */}
      <Section title="코스 소개">
        {course.description ? (
          <AppText role="body" style={styles.description}>
            {course.description}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          {course.recommendedTime ? <MetaRow icon="time" text={`추천 시간대 ${course.recommendedTime}`} /> : null}
          <MetaRow icon="finished" text={`완주 ${formatCount(course.finisherCount)}명 · 이번 주 ${formatCount(course.weeklyRunnerCount)}명`} />
          <MetaRow icon="tabMy" text={`만든 사람 ${course.creatorName}`} />
        </View>
      </Section>

      {/* REV-001 완주자 평가 */}
      <Section title="완주자 평가">
        <ReviewsSection course={course} />
      </Section>

      {/* CREG-005 신고: 맨 아래, 눈에 띄지 않게 */}
      <AppPressable
        onPress={() => router.push({ pathname: '/course/[id]/report', params: { id: course.id } })}
        accessibilityRole="button"
        accessibilityLabel="이 코스 신고하기"
        style={styles.report}
      >
        <AppIcon name="report" size={14} color={colors.text.secondary} />
        <AppText role="label" tone="secondary">
          코스 신고
        </AppText>
      </AppPressable>
      <View style={{ height: spacing.lg, backgroundColor: colors.bg.canvas }} />
    </>
  );
}

function BodySkeleton() {
  const { colors } = useTheme();
  const bar = { backgroundColor: colors.bg.surface, borderRadius: radius.control };
  return (
    <View accessible accessibilityLabel="코스 정보 불러오는 중" accessibilityState={{ busy: true }} style={styles.skeleton}>
      <View style={[bar, { height: typography.label.lineHeight, width: '40%' }]} />
      <View style={[bar, { height: typography.screenTitle.lineHeight, width: '65%' }]} />
      <View style={[bar, { height: 48, width: '100%' }]} />
      <View style={[bar, { height: 180, width: '100%', borderRadius: radius.sheet }]} />
    </View>
  );
}

function BigStat({ label, value, unit, plain }: { label: string; value: string; unit?: string; plain?: boolean }) {
  return (
    <View style={styles.bigStat} accessible accessibilityLabel={`${label} ${value}${unit ? ` ${unit}` : ''}`}>
      <View style={styles.bigStatValue}>
        <AppText role="sectionTitle" tabular numberOfLines={1} style={plain ? styles.bigStatPlain : styles.bigStatNumber}>
          {value}
        </AppText>
        {unit ? (
          <AppText role="label" tone="secondary">
            {unit}
          </AppText>
        ) : null}
      </View>
      <AppText role="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

function CourseTitlesSection({ courseId }: { courseId: string }) {
  const titles = useCourseTitles(courseId);
  if (titles.isPending) return null;
  return (
    <Section title="코스 타이틀" note="인증된 기록만 세요">
      {titles.data ? (
        <CourseTitlesCard titles={titles.data} />
      ) : (
        <AppText role="body" tone="secondary">
          코스 크라운 · 로컬 레전드를 불러오지 못했어요.
        </AppText>
      )}
    </Section>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppDivider variant="section" style={styles.sectionBand} />
      <View style={styles.sectionHead}>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </AppText>
        {note ? (
          <AppText role="caption" tone="secondary">
            {note}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function EnvItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.envItem, { backgroundColor: colors.bg.surface }]} accessible accessibilityLabel={`${label} ${value}`}>
      <AppIcon name={icon} size={18} color={colors.text.secondary} />
      <View style={styles.flex}>
        <AppText role="caption" tone="secondary">
          {label}
        </AppText>
        <AppText role="label" style={styles.envValue} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <AppIcon name={icon} size={15} color={colors.text.secondary} />
      <AppText role="label" tone="secondary" tabular>
        {text}
      </AppText>
    </View>
  );
}

function RoundButton({ icon, label, onPress, selected = false }: { icon: IconName; label: string; onPress: () => void; selected?: boolean }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.round, { backgroundColor: colors.bg.elevated, boxShadow: elevation.mapOverlay }]}
    >
      <AppIcon name={icon} size={20} color={selected ? colors.text.accent : colors.text.primary} />
    </AppPressable>
  );
}

// CRS-107 코스 공유: 공유 링크(서버가 있으면 메신저에서 눌리는 공유 페이지 주소)와 코스 요약. 웹 등 공유 API가 없는 환경에서는 조용히 넘어간다.
async function shareCourse(course: CourseDetail) {
  try {
    const link = await getShareRepository().create('COURSE', course.id, course.id);
    await Share.share({
      message: `${course.name} · ${formatDistanceKm(course.distanceM, 1)}km\n달리모에서 이 코스 같이 달려요\n${link.url}`,
    });
  } catch {
    // 사용자가 취소했거나 공유를 지원하지 않는 환경
  }
}

function difficultyLabel(d: CourseDifficulty | null) {
  if (d === 'EASY') return '쉬움';
  if (d === 'MODERATE') return '보통';
  if (d === 'HARD') return '어려움';
  return '--';
}

function levelLabel(level: Level | null, words: [string, string, string]) {
  if (level === 'LOW') return words[0];
  if (level === 'MEDIUM') return words[1];
  if (level === 'HIGH') return words[2];
  return '정보 없음';
}

function presenceLabel(v: boolean | null) {
  if (v == null) return '정보 없음';
  return v ? '있음' : '없음';
}

const CTA_BAR = touchTarget.primary + spacing.md * 2;

const styles = StyleSheet.create({
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  rankingLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  root: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  round: {
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
    minHeight: HEADER_BUTTON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.xl,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg + spacing.xs,
    gap: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  bigStat: {
    flex: 1,
    gap: 2,
  },
  bigStatValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bigStatNumber: {
    fontFamily: fontFamily.black,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.8,
    transform: [{ skewX: OBLIQUE_SKEW }],
  },
  bigStatPlain: {
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 32,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionBand: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 19,
  },
  gapDots: {
    alignItems: 'center',
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  envItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md + spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  envValue: {
    fontFamily: fontFamily.bold,
  },
  description: {
    lineHeight: 24,
  },
  meta: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  skeleton: {
    paddingHorizontal: spacing.lg + spacing.xs,
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
