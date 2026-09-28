import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { GpsStatus } from '@/components/GpsStatus';
import { PrimaryRunButton, type RunAvailability } from '@/components/PrimaryRunButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { DEFAULT_REGION_CENTER } from '@/entities/course/api/mockCourseRepository';
import type { CourseDetail } from '@/entities/course/types';
import type { RunMode } from '@/entities/run/types';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';
import { MOCK_MAP_BASE } from '@/shared/map/mockMapBase';

import { ReadyMap } from './components/ReadyMap';
import { MODE_TITLE, parseRunPlan, toRunPlanParams, type ReadyPlan, type RunPlanParams } from './runPlanParams';
import type { RunReadyScenario } from './scenario';
import { useRunReadiness, type CourseLoad, type Readiness } from './useRunReadiness';

const MODE_ICON: Partial<Record<RunMode, IconName>> = {
  FREE: 'tabRun',
  COURSE: 'modeCourse',
  PB: 'modePB',
  CHALLENGE: 'modeRival',
};

// SCR-R01 Run 홈/준비 (RUN-001~003, LOC-001~003). 89장: dark pre-run canvas, 가운데 GPS 상태와 목표, 아래 넓은 Start.
// 레퍼런스 blend: Nike Run Club(큰 Start, 시작 전 정리된 화면) + Runkeeper(GPS 준비 상태) — REFERENCE-MATRIX Run Ready.
export function RunReadyScreen({ params, scenario }: { params: RunPlanParams; scenario: RunReadyScenario }) {
  return (
    <ThemeProvider scheme="dark">
      <RunReady plan={parseRunPlan(params)} scenario={scenario} />
    </ThemeProvider>
  );
}

function RunReady({ plan, scenario }: { plan: ReadyPlan; scenario: RunReadyScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const courseId = plan.kind === 'course' ? plan.plan.courseId : null;
  const { readiness, course } = useRunReadiness(courseId, scenario, focused);
  const detail = course.kind === 'ready' ? course.course : null;
  const courseName = detail?.name ?? (plan.kind === 'course' ? plan.courseName : null);

  const status = statusCopy(readiness, plan.kind === 'free');
  const button = buttonState(readiness, course);
  const position = 'position' in readiness ? readiness.position : null;

  const start = () => {
    router.push({ pathname: '/run/active', params: toRunPlanParams(plan, courseName) });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={styles.header}>
        {plan.kind === 'course' ? (
          <>
            <AppPressable
              onPress={() => router.replace('/run')}
              accessibilityLabel="코스 러닝 취소, 자유 달리기로"
              style={[styles.round, { backgroundColor: colors.bg.surface }]}
            >
              <AppIcon name="close" size={20} color={colors.text.primary} />
            </AppPressable>
            <AppText role="label" tone="secondary" style={styles.headerTitle}>
              코스 러닝 준비
            </AppText>
            <View style={styles.round} />
          </>
        ) : (
          <Wordmark height={22} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrap}>
          <ReadyMap
            base={MOCK_MAP_BASE}
            route={detail?.route ?? null}
            position={position}
            fallbackCenter={detail?.route[0] ?? DEFAULT_REGION_CENTER}
            showWayToStart={readiness.kind === 'tooFar'}
            locating={readiness.kind === 'acquiring'}
            accessibilityLabel={['내 위치 지도', detail ? `${detail.name} 출발점` : null, status.headline].filter(Boolean).join(', ')}
          />
          {readiness.kind !== 'denied' && readiness.kind !== 'checking' ? (
            <GpsStatus quality={'quality' in readiness ? readiness.quality : readiness.kind === 'poor' ? 'poor' : 'acquiring'} variant="pill" style={styles.gpsPill} />
          ) : null}
          {readiness.kind === 'denied' ? (
            <View style={[styles.deniedOverlay, { backgroundColor: colors.bg.canvas + 'CC' }]}>
              <View style={[styles.lock, { backgroundColor: colors.bg.elevated }]}>
                <AppIcon name="lock" size={28} color={colors.text.primary} />
              </View>
              <SecondaryButton label="설정에서 위치 허용하기" emphasized size="sm" onPress={() => Linking.openSettings().catch(() => undefined)} />
            </View>
          ) : null}
        </View>

        <View style={styles.status} accessibilityLiveRegion="polite">
          <AppText role="screenTitle" accessibilityRole="header">
            {status.lead ? (
              <AppText role="screenTitle" tone="accent" tabular>
                {status.lead}
              </AppText>
            ) : null}
            {status.headline}
          </AppText>
          <AppText role="body" tone="secondary">
            {status.body}
          </AppText>
        </View>

        {plan.kind === 'free' ? (
          <FreeGoal />
        ) : course.kind === 'error' ? (
          <View style={[styles.goal, { backgroundColor: colors.bg.surface }]}>
            <StateNotice
              icon="warning"
              tone="warning"
              title="코스 정보를 불러오지 못했어요"
              body="연결을 확인하고 다시 시도해 주세요."
              actions={<SecondaryButton label="다시 시도" size="sm" onPress={course.retry} />}
            />
          </View>
        ) : (
          <CourseGoal mode={plan.plan.mode} course={detail} name={courseName} targetSec={plan.plan.targetSec ?? null} targetLabel={plan.plan.targetLabel ?? null} />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.subtle }]}>
        <PrimaryRunButton
          label={readiness.kind === 'checking' ? '준비 확인 중' : '시작'}
          loading={readiness.kind === 'checking'}
          availability={button.availability}
          reason={button.reason}
          onPress={start}
        />
      </View>
    </View>
  );
}

// ---- 목표 카드 ----

function ModeBadge({ mode }: { mode: RunMode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.action.tint }]}>
      <AppIcon name={MODE_ICON[mode] ?? 'start'} size={14} color={colors.text.accent} />
      <AppText role="label" tone="accent" style={styles.badgeText}>
        {MODE_TITLE[mode]}
      </AppText>
    </View>
  );
}

// RUN-001 빠른 러닝. 125장: Run 탭에서 시작하면 목적 중심 진입점을 보여준다. TRAINING은 roadmap 후속이라 두지 않는다.
function FreeGoal() {
  const { colors } = useTheme();
  return (
    <View style={[styles.goal, { backgroundColor: colors.bg.surface }]}>
      <ModeBadge mode="FREE" />
      <AppText role="sectionTitle">코스 없이 바로 달리기</AppText>
      <AppText role="label" tone="secondary">
        시간 · 거리 · 페이스를 기록해요
      </AppText>
      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
      <View style={styles.entryRow}>
        <EntryLink icon="modeCourse" title="코스 달리기" caption="기록이 남는 코스" onPress={() => router.navigate('/')} />
        <EntryLink icon="modeTogether" title="함께 달리기" caption="친구와 동시에" onPress={() => router.navigate('/together')} />
      </View>
    </View>
  );
}

function EntryLink({ icon, title, caption, onPress }: { icon: IconName; title: string; caption: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AppPressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${title}, ${caption}`} style={[styles.entry, { backgroundColor: colors.bg.elevated }]}>
      <AppIcon name={icon} size={20} color={colors.text.accent} />
      <View style={styles.entryText}>
        <AppText role="label" style={styles.entryTitle} numberOfLines={1}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary" numberOfLines={1}>
          {caption}
        </AppText>
      </View>
      <AppIcon name="collapse" size={16} color={colors.text.secondary} />
    </AppPressable>
  );
}

function CourseGoal({
  mode,
  course,
  name,
  targetSec,
  targetLabel,
}: {
  mode: RunMode;
  course: CourseDetail | null;
  name: string | null;
  targetSec: number | null;
  targetLabel: string | null;
}) {
  const { colors } = useTheme();
  const km = course ? formatDistanceKm(course.distanceM, 2) : '--';
  // PB·라이벌: 목표 기록, 완주: 예상 시간
  const goalSec = targetSec ?? course?.estimatedSec ?? null;
  const pace = goalSec != null && course ? goalSec / (course.distanceM / 1000) : null;

  return (
    <View style={[styles.goal, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.goalTop}>
        <ModeBadge mode={mode} />
        <AppText role="label" tone="secondary" tabular>
          {km} km
        </AppText>
      </View>
      <AppText role="sectionTitle" numberOfLines={2}>
        {name ?? '코스 불러오는 중'}
      </AppText>
      <View style={styles.goalMetric}>
        <View style={styles.goalMain}>
          <AppText role="caption" tone="secondary">
            {targetSec != null ? `목표 · ${targetLabel ?? '기록'}` : '예상 완주'}
          </AppText>
          <AppText role="metricLarge" tabular tone={targetSec != null ? 'accent' : 'primary'}>
            {formatDuration(goalSec)}
          </AppText>
        </View>
        <View style={styles.goalSide}>
          <AppText role="caption" tone="secondary">
            페이스
          </AppText>
          <AppText role="sectionTitle" tabular style={styles.pace}>
            {formatPace(pace)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

// ---- 상태 문구 (73장: 준비되지 않으면 이유를 설명) ----

function statusCopy(r: Readiness, free: boolean): { lead?: string; headline: string; body: string } {
  switch (r.kind) {
    case 'checking':
      return { headline: '준비 확인 중', body: '위치 권한과 GPS를 확인하고 있어요' };
    case 'denied':
      return { headline: '위치 권한이 필요해요', body: '달리기 기록과 코스 완주 확인에 위치를 써요. 코스 탐색은 권한 없이도 쓸 수 있어요.' };
    case 'acquiring':
      return { headline: 'GPS 찾는 중', body: '하늘이 트인 곳에서 잠시 기다려 주세요' };
    case 'poor':
      return { headline: 'GPS 신호가 약해요', body: '건물이나 나무가 적은 곳으로 조금 옮겨 주세요' };
    case 'tooFar':
      return {
        lead: `${r.startDistanceM.toLocaleString('ko-KR')}m `,
        headline: '더 가야 출발점이에요',
        body: `출발점 ${r.radiusM}m 안에서 시작해야 코스 기록으로 인정돼요`,
      };
    case 'ready':
      return {
        headline: '출발 준비 완료',
        body: free || r.startDistanceM == null ? '시작을 누르면 3초 뒤 기록이 시작돼요' : `출발점에서 ${r.startDistanceM}m · 시작을 누르면 3초 뒤 기록이 시작돼요`,
      };
  }
}

function buttonState(r: Readiness, course: CourseLoad): { availability: RunAvailability; reason?: string } {
  if (course.kind === 'error') return { availability: 'disabledGPS', reason: '코스 정보를 불러온 뒤 시작할 수 있어요' };
  switch (r.kind) {
    case 'denied':
      return { availability: 'disabledPermission' };
    case 'acquiring':
      return { availability: 'disabledGPS', reason: 'GPS를 찾으면 시작할 수 있어요' };
    case 'poor':
      return { availability: 'disabledGPS' };
    case 'tooFar':
      return { availability: 'disabledStartPoint' };
    default:
      return { availability: 'ready' };
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  mapWrap: {
    flex: 1,
    minHeight: 200,
  },
  gpsPill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  deniedOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    gap: spacing.xs,
  },
  goal: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
  },
  goalMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  goalMain: {
    flexShrink: 1,
  },
  goalSide: {
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
  },
  pace: {
    fontFamily: fontFamily.extrabold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  entry: {
    flex: 1,
    minHeight: touchTarget.min + spacing.md,
    borderRadius: radius.control,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryText: {
    flex: 1,
  },
  entryTitle: {
    fontFamily: fontFamily.bold,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
