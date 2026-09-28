import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { ElevationProfile } from '@/components/ElevationProfile';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import type { CourseDetail } from '@/entities/course/types';
import type { RunResult } from '@/entities/run/result';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import { formatDistanceKm, formatDuration, formatDurationSpoken, formatPace } from '@/shared/format';

import { ResultMap } from './components/ResultMap';
import { SplitList } from './components/SplitList';
import { outcomeOf, type Outcome } from './outcome';
import { useRunResult } from './useRunResult';

// SCR-R04 러닝 결과 (RST-001~005). 89장: light로 복귀. 93장 배치, 63.1장 우선순위:
// 감정 피드백 → 핵심 수치 → 지도 → 공식 검증 상태 → PB·랭킹·친구 변화 → 공유/다시 도전 → 구간·고도.
// 레퍼런스 blend: Strava(기록 객체) + Runna(완료의 의미) — CLAUDE.md 4항 Result.
export function RunResultScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useRunResult(id);
  const close = () => router.dismissTo('/run');

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppPressable onPress={close} accessibilityLabel="결과 닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="close" size={20} color={colors.text.primary} />
        </AppPressable>
      </View>
      {state.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="결과 불러오는 중" />
        </View>
      ) : state.kind === 'notFound' ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            title="결과를 찾을 수 없어요"
            body="기록은 달리기 기록 목록에서 다시 볼 수 있어요."
            actions={<SecondaryButton label="달리기 탭으로" size="sm" onPress={close} />}
          />
        </View>
      ) : (
        <ResultBody result={state.result} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function ResultBody({ result: r, bottomInset }: { result: RunResult; bottomInset: number }) {
  const { colors } = useTheme();
  const outcome = outcomeOf(r);
  const course = useCourse(r.course?.id ?? null);
  const time = r.course?.timeSec ?? r.activeSec;
  const coursePace = r.course?.timeSec != null && course ? r.course.timeSec / (course.distanceM / 1000) : r.avgPaceSec;
  const extra = r.course?.timeSec != null && course && r.distanceM - course.distanceM > 50;

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.xxl }]} showsVerticalScrollIndicator={false}>
      {/* 1. 감정 피드백 */}
      <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={`${outcome.headline}. ${outcome.detail}`}>
        <View style={styles.context}>
          <AppText role="label" tone="secondary" numberOfLines={1} style={styles.flexShrink}>
            {[r.course?.name, MODE_TITLE[r.mode]].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={styles.headlineRow}>
          <OutcomeMark kind={outcome.kind} />
          <AppText role="screenTitle" style={styles.headline}>
            {outcome.headline}
          </AppText>
        </View>
        <AppText role="body" tone="secondary">
          {outcome.detail}
        </AppText>
      </View>

      {/* 2. 핵심 수치 */}
      <View style={styles.metrics}>
        <View style={styles.flexShrink}>
          <AppText role="metricHero" tabular numberOfLines={1} adjustsFontSizeToFit>
            {formatDuration(time)}
          </AppText>
          <AppText role="label" tone="secondary">
            {r.course?.timeSec != null ? '코스 기록' : '시간'}
          </AppText>
        </View>
        <View style={styles.metricSide}>
          <AppText role="metricLarge" tabular>
            {formatDistanceKm(r.course?.timeSec != null && course ? course.distanceM : r.distanceM)}
            <AppText role="sectionTitle" tone="secondary">
              {' '}
              km
            </AppText>
          </AppText>
          <AppText role="label" tone="secondary" tabular>
            {formatPace(coursePace)}/km
          </AppText>
        </View>
      </View>
      {extra ? (
        <AppText role="caption" tone="secondary" tabular>
          완주 뒤까지 합친 전체 {formatDistanceKm(r.distanceM)}km · {formatDuration(r.activeSec)}
        </AppText>
      ) : null}

      {/* 3. 지도 */}
      <ResultMap path={r.path} course={course?.route ?? null} height={220} />

      {/* 4. 공식 검증 · 동기화 상태 */}
      <RecordState result={r} />

      {/* 5. PB · 랭킹 · 친구 */}
      {r.course ? (
        <View style={styles.competition}>
          <Competition result={r} />
          <SecondaryButton
            label="코스 랭킹 보기"
            size="sm"
            onPress={() => router.push({ pathname: '/course/[id]/ranking', params: { id: r.course!.id, tab: 'weekly' } })}
            style={styles.rankingLink}
          />
        </View>
      ) : null}

      {/* 6. 공유 · 다시 도전 */}
      <Actions result={r} outcome={outcome} />

      {/* 7. 구간 · 고도 */}
      <View style={[styles.section, { borderTopColor: colors.border.subtle }]}>
        <AppText role="sectionTitle" accessibilityRole="header">
          구간 기록
        </AppText>
        <SplitList splits={r.splits} />
      </View>
      {course?.elevationProfile ? (
        <View style={[styles.section, { borderTopColor: colors.border.subtle }]}>
          <AppText role="sectionTitle" accessibilityRole="header">
            고도
          </AppText>
          <ElevationProfile profile={course.elevationProfile} gainM={course.elevationGainM} />
        </View>
      ) : null}
    </ScrollView>
  );
}

// 결과 종류 표시. 색만이 아니라 아이콘 모양으로도 구분한다.
function OutcomeMark({ kind }: { kind: Outcome['kind'] }) {
  const { colors } = useTheme();
  const good = kind === 'pb' || kind === 'firstRecord' || kind === 'won';
  const icon: IconName = kind === 'pb' || kind === 'firstRecord' ? 'trophy' : kind === 'dnf' ? 'unverified' : kind === 'free' ? 'tabRun' : 'finished';
  return (
    <View style={[styles.mark, { backgroundColor: good ? colors.action.primary : colors.bg.surface }]}>
      <AppIcon name={icon} size={22} color={good ? colors.action.onPrimary : colors.text.primary} />
    </View>
  );
}

function RecordState({ result: r }: { result: RunResult }) {
  const { colors } = useTheme();
  if (r.sync === 'localOnly') {
    return (
      <Row icon="offline" title="휴대폰에만 저장됨" body={r.course ? '인터넷에 연결되면 올리고 공식 기록 검증을 받아요' : '인터넷에 연결되면 자동으로 올려요'} />
    );
  }
  if (r.sync === 'syncing') {
    return <Row loading title="기록 올리는 중" body="다 올리면 공식 기록 검증이 시작돼요" />;
  }
  if (r.verification === 'none') return null;
  return (
    <View style={styles.stateBlock} accessibilityLiveRegion="polite">
      <VerificationBadge status={r.verification} />
      {r.verification === 'pending' ? (
        <AppText role="caption" tone="secondary">
          검증이 끝나면 PB와 순위에 반영돼요
        </AppText>
      ) : null}
      {r.verificationReason ? (
        <View style={[styles.reason, { backgroundColor: colors.bg.surface }]}>
          <AppText role="label">{r.verificationReason}</AppText>
          <AppText role="caption" tone="secondary">
            이번 기록은 랭킹에 반영되지 않아요
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function Row({ icon, loading, title, body }: { icon?: IconName; loading?: boolean; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.bg.surface }]} accessible accessibilityLabel={`${title}. ${body}`} accessibilityLiveRegion="polite">
      {loading ? <BrandLoader size={24} label={title} /> : icon ? <AppIcon name={icon} size={20} color={colors.text.primary} /> : null}
      <View style={styles.flexShrink}>
        <AppText role="label" style={styles.bold}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary">
          {body}
        </AppText>
      </View>
    </View>
  );
}

// RST-002 PB 변화, RST-003 주간 순위 변화, RST-004 친구 비교
function Competition({ result: r }: { result: RunResult }) {
  const { colors } = useTheme();
  const time = r.course?.timeSec ?? null;
  const verified = r.verification === 'verified';
  const excluded = r.verification === 'unverified' || r.verification === 'rejected';
  const waiting = excluded ? '반영 안 됨' : '검증 뒤 반영';

  const pb = !verified || !r.pb || time == null ? waiting : r.pb.previousSec == null ? `첫 기록 ${formatDuration(time)}` : r.pb.improved ? `${formatDuration(r.pb.previousSec)} → ${formatDuration(time)}` : `${formatDuration(r.pb.previousSec)} 유지`;
  const rank = !verified || !r.weeklyRank ? waiting : r.weeklyRank.before != null ? `${r.weeklyRank.before}위 → ${r.weeklyRank.after}위` : `${r.weeklyRank.after}위`;
  const friendDiff = r.friendBest && time != null ? time - r.friendBest.timeSec : null;
  const rankUp = verified && r.weeklyRank && r.weeklyRank.before != null && r.weeklyRank.after < r.weeklyRank.before;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.surface }]}>
      <StatRow label="내 PB" value={pb} accent={verified && !!r.pb?.improved} muted={pb === waiting} />
      <StatRow label="이번 주 순위" value={rank} accent={!!rankUp} muted={rank === waiting} icon={rankUp ? 'rankUp' : undefined} />
      {r.friendBest && friendDiff != null ? (
        <StatRow
          label={`${r.friendBest.name} 최고 ${formatDuration(r.friendBest.timeSec)}`}
          value={friendDiff === 0 ? '같아요' : `${formatDurationSpoken(friendDiff)} ${friendDiff < 0 ? '빨라요' : '느려요'}`}
          accent={friendDiff < 0}
        />
      ) : null}
    </View>
  );
}

// muted: 아직 값이 없는 칸(검증 뒤 반영 · 반영 안 됨)은 숫자처럼 보이지 않게 흐린 작은 글자로
function StatRow({ label, value, accent = false, muted = false, icon }: { label: string; value: string; accent?: boolean; muted?: boolean; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statRow} accessible accessibilityLabel={`${label} ${value}`}>
      <AppText role="label" tone="secondary" style={styles.flexShrink}>
        {label}
      </AppText>
      <View style={styles.statValue}>
        {icon ? <AppIcon name={icon} size={16} color={colors.text.accent} /> : null}
        <AppText role={muted ? 'label' : 'sectionTitle'} tabular tone={muted ? 'secondary' : accent ? 'accent' : 'primary'} style={styles.bold}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

// 63장: 결과가 공유 → 다시 도전으로 이어진다. 버튼은 공유(보조) + 다시 도전(핵심 하나)
function Actions({ result: r, outcome }: { result: RunResult; outcome: Outcome }) {
  const share = () => shareResult(r, outcome);
  if (!r.course) {
    return (
      <View style={styles.actions}>
        <SecondaryButton label="공유" onPress={share} style={styles.flex} />
        <SecondaryButton label="확인" emphasized onPress={() => router.dismissTo('/run')} style={styles.flex} />
      </View>
    );
  }
  // PB를 새로 세웠으면 다음 도전 목표는 이번 기록
  const target = r.pb?.improved && r.course.timeSec != null ? { sec: r.course.timeSec, label: '내 PB' } : r.target;
  const label = r.mode === 'PB' ? 'PB 다시 도전' : r.mode === 'CHALLENGE' && outcome.kind === 'won' ? '다시 달리기' : '다시 도전';
  return (
    <View style={styles.actions}>
      <SecondaryButton label="공유" onPress={share} style={styles.share} />
      <PrimaryRunButton
        label={label}
        style={styles.flex}
        onPress={() =>
          router.dismissTo({
            pathname: '/run',
            params: {
              mode: r.mode,
              courseId: r.course!.id,
              courseName: r.course!.name,
              ...(r.mode !== 'COURSE' && target ? { targetSec: String(target.sec), targetLabel: target.label } : {}),
            },
          })
        }
      />
    </View>
  );
}

// RST-005 결과 공유. 공유 카드(SCR-R05)는 다음 단계이며, 지금은 기록 요약 + 코스 딥링크를 보낸다 (SHR-004).
async function shareResult(r: RunResult, outcome: Outcome) {
  const time = formatDuration(r.course?.timeSec ?? r.activeSec);
  const lines = [
    [outcome.headline, r.course?.name].filter(Boolean).join(' · '),
    `${time} · ${formatDistanceKm(r.distanceM)}km · ${formatPace(r.avgPaceSec)}/km`,
    r.course ? `달리모에서 이 코스 같이 달려요\ndallimo://course/${r.course.id}` : '달리모에서 달렸어요',
  ];
  try {
    await Share.share({ message: lines.join('\n') });
  } catch {
    // 사용자가 취소했거나 공유를 지원하지 않는 환경
  }
}

function useCourse(id: string | null): CourseDetail | null {
  const repo = useMemo(() => createMockCourseRepository('normal'), []);
  const q = useQuery({
    queryKey: ['course', 'detail', id, 'normal'],
    queryFn: () => repo.getDetail(id as string),
    enabled: id != null,
    retry: false,
  });
  return q.data ?? null;
}

const styles = StyleSheet.create({
  competition: {
    gap: spacing.md,
  },
  rankingLink: {
    alignSelf: 'flex-start',
  },
  root: {
    flex: 1,
  },
  header: {
    height: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
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
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
  },
  context: {
    flexDirection: 'row',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headline: {
    flexShrink: 1,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  metricSide: {
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
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
  stateBlock: {
    gap: spacing.sm,
  },
  reason: {
    borderRadius: radius.control,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  card: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statRow: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  share: {
    minWidth: 96,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
});
