import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { GpsStatus } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { getRankingRepository } from '@/entities/ranking/api';
import type { GhostRun } from '@/entities/ranking/types';
import { runResultRepository } from '@/entities/run/api';
import { ghostFractionAt } from '@/entities/run/ghost';
import { flattenBlocks } from '@/entities/workout/flatten';
import { stepResults } from '@/entities/workout/tracker';
import type { WorkoutPlan } from '@/entities/workout/types';
import { endActiveRun, useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { useSplitAnnouncer } from '@/features/run/voice/useSplitAnnouncer';
import { useGapLine, useGapVoice } from '@/features/run/voice/useCompetitionVoice';
import { useIntervalCues } from '@/features/run/voice/useIntervalCues';
import { useRunLiveActivity } from '@/features/run/liveActivity/useRunLiveActivity';
import { segmentLine } from '@/features/run/segment/segmentLine';
import { useSegmentAttack, type SegmentAttack } from '@/features/run/segment/useSegmentAttack';
import { activeMs, type ActiveRunSnapshot, type RunFinishResult, type RunningEngine } from '@/features/run/engine/runningEngine';
import { sendWatchEnd, sendWatchIdle, useWatchHeartRate, useWatchLink } from '@/features/watch/useWatchLink';
import { isManualStep, soloStrip, type WatchRunContext } from '@/features/watch/watchMessages';
import { formatDistanceKm, formatDuration, formatDurationSpoken, formatPace } from '@/shared/format';
import { pointAt, type GeoPoint } from '@/shared/geo';
import { haptics } from '@/shared/haptics';
import { speak } from '@/shared/voice';

import { IntervalPanel } from './components/IntervalPanel';
import { ModeStrip, type RunTarget } from './components/ModeStrip';
import { RunPathMap } from './components/RunPathMap';
import { SegmentAttackBanner } from './components/SegmentAttackBanner';
import { runNoticeOf } from './runNotice';
import { useElapsedSec } from './useElapsedSec';

// SCR-R02 Active Run 공통 Run Shell (72장 6~7번). 92장 레이아웃:
// 위 GPS·기록 상태 → 가운데 giant 거리 → 시간·평균 페이스 → 모드별 강조 strip 하나 → 아래 넓은 일시정지.
// 모드별로 바뀌는 것은 strip(`ModeStrip`)과 지도 위 기준 코스뿐이다. 인터벌 달리기는 구간 중심 패널(`IntervalPanel`)로 바뀐다.
type Props = {
  engine: RunningEngine;
  summary: string;
  // 코스 러닝이면 기준 코스 (CRUN-001 기준 코스/실제 경로 동시 표시)
  course: { id: string; name: string; route: GeoPoint[] } | null;
  // PB ATTACK / CHALLENGE 목표
  target: RunTarget | null;
  // 인터벌 달리기 (123장)
  workout?: WorkoutPlan | null;
};

export function ActiveRunScreen({ engine, summary, course, target, workout = null }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useRunSnapshot(engine, (s) => s.status);
  const [view, setView] = useState<'metrics' | 'map'>('metrics');
  const [confirming, setConfirming] = useState(false);
  const [finished, setFinished] = useState<{ result: RunFinishResult; id: string } | null>(null);
  // 코스 끝에 닿았거나 인터벌 구간을 모두 마쳤으면 확인 없이 바로 저장할 수 있다
  const courseDone = useRunSnapshot(engine, (s) => s.course?.completedActiveMs != null);
  const flat = useMemo(() => (workout ? flattenBlocks(workout.blocks) : null), [workout]);
  const intervalDone = useRunSnapshot(engine, (s) => flat != null && s.interval != null && s.interval.boundaries.length >= flat.length);
  const completed = courseDone || intervalDone;
  useCourseAlerts(engine, target);
  // 124장 Ghost: PB 어택은 내 PB, 도전은 상대 기록의 실제 흐름과 비교한다 (없으면 고르게 나눈 페이스)
  const chase = useChaseTarget(engine, course?.id ?? null, target);
  useAutoPauseAlerts(engine);
  // AUD-002 경쟁 안내: 목표보다 앞섬 · 뒤처짐, 구간 안내 끝에 목표 차이
  useGapVoice(engine, chase);
  // 인터벌 달리기는 구간 안내가 1km 안내를 대신한다 (겹쳐 읽지 않게)
  useSplitAnnouncer(engine, useGapLine(engine, chase), flat == null);
  useIntervalCues(engine, flat);
  const saveLabel = intervalDone ? '인터벌 기록 저장' : '완주 기록 저장';
  // 124장 Segment Attack: 코스 러닝이면 약 1km 구간마다 내 최고 · 1위와 비교 (인터벌 달리기는 구간이 따로 있다)
  const attack = useSegmentAttack(engine, flat ? null : (course?.id ?? null));
  // WATCH-001~004: 워치에 지금 상태를 보여 주고 워치 조작을 받는다 (휴대폰 버튼과 같은 동작)
  const mirrorContext = (s: ActiveRunSnapshot, now: number): WatchRunContext => ({
    title: summary,
    // 그냥 코스 러닝이면 구간 도전이 워치 한 줄이 된다 (PB · 도전은 목표 차이가 먼저)
    strip: (s.mode === 'COURSE' && attack ? watchSegmentStrip(attack, s, now) : null) ?? soloStrip(s, now, { target: chase, flat }),
    manualStep: isManualStep(s, flat),
    completed,
    saveLabel,
  });
  // 잠금 화면 · 다이내믹 아일랜드에도 같은 내용 (결정 로그 83항)
  useRunLiveActivity(engine, { context: mirrorContext });
  useWatchLink(engine, {
    context: mirrorContext,
    onCommand: (cmd) => {
      const st = engine.getSnapshot().status;
      if (cmd === 'pause' && st === 'RUNNING') {
        haptics.runControl();
        engine.pause();
      } else if (cmd === 'resume' && st === 'PAUSED') {
        haptics.runControl();
        engine.resume();
      } else if (cmd === 'next' && (st === 'RUNNING' || st === 'PAUSED') && isManualStep(engine.getSnapshot(), flat)) {
        haptics.runControl();
        engine.nextIntervalStep();
      } else if (cmd === 'finish' && (st === 'RUNNING' || st === 'PAUSED')) {
        // 워치에서 이미 확인했다
        void finish();
      }
    },
  });

  // 러닝 중 Android 뒤로 가기로 화면을 벗어나지 않게 한다 (종료는 일시정지 → 종료 확인으로만)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const finish = async () => {
    setConfirming(false);
    const result = await engine.finish();
    // RUN-006 Local First: 서버에 올렸든 못 올렸든 먼저 기기에 결과를 남긴다
    const id = await runResultRepository.saveFinished(
      {
        clientRunUuid: result.clientRunUuid,
        startedAt: result.startedAt,
        mode: result.mode,
        distanceM: result.distanceM,
        activeSec: result.activeSec,
        avgPaceSec: result.avgPaceSec,
        splits: result.splits,
        path: result.path,
        course: course ? { id: course.id, name: course.name, timeSec: result.courseTimeSec } : null,
        target: target ? { sec: target.sec, label: target.label } : null,
        // 인터벌 달리기: 구간별 실제 거리 · 시간 (123.2장)
        workout:
          workout && flat && result.intervalBoundaries
            ? { templateId: workout.id, version: workout.version, name: workout.name, steps: stepResults(flat, result.intervalBoundaries) }
            : null,
      },
      result.synced,
    );
    setFinished({ result, id });
    sendWatchEnd(result, summary);
    // 동기화까지 끝나면 결과로 넘어간다. 오프라인이면 안내를 보여주고 사용자가 결과를 연다.
    if (result.synced) openResult(id);
  };

  // 기록 없이 끝내기 (짧은 러닝만, 결정 로그 82항): 저장 · 업로드하지 않고 시작 전 화면으로 돌아간다
  const discard = async () => {
    setConfirming(false);
    await engine.discard();
    sendWatchIdle();
    endActiveRun();
    if (router.canGoBack()) router.back();
    else router.replace('/run');
  };

  const openResult = (id: string) => {
    endActiveRun();
    router.replace({ pathname: '/run/result', params: { id } });
  };

  if (status === 'FINISHING' || status === 'FINISHED') {
    return <FinishingView engine={engine} result={finished?.result ?? null} onOpenResult={() => finished && openResult(finished.id)} />;
  }

  const paused = status === 'PAUSED';
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <TopBar engine={engine} view={view} onToggleView={() => setView((v) => (v === 'metrics' ? 'map' : 'metrics'))} />
      <RunNotice engine={engine} />

      {view === 'metrics' && flat ? (
        <IntervalPanel engine={engine} flat={flat} />
      ) : view === 'metrics' ? (
        <View style={styles.metrics}>
          <DistanceHero engine={engine} />
          <View style={styles.row}>
            <ElapsedMetric engine={engine} size="large" />
            <AvgPaceMetric engine={engine} size="large" />
          </View>
          {attack ? <SegmentAttackBanner engine={engine} attack={attack} /> : null}
          <ModeStrip engine={engine} target={chase} />
        </View>
      ) : (
        <View style={styles.mapView}>
          <View style={[styles.mapFrame, { borderColor: colors.border.subtle }]}>
            <MapLayer engine={engine} courseRoute={course?.route ?? null} ghost={chase?.ghost ?? null} />
          </View>
          <View style={styles.row}>
            <DistanceCompact engine={engine} />
            <ElapsedMetric engine={engine} size="medium" />
            <AvgPaceMetric engine={engine} size="medium" />
          </View>
        </View>
      )}

      <Controls
        paused={paused}
        completed={completed}
        saveLabel={saveLabel}
        onSave={finish}
        disabled={status !== 'RUNNING' && status !== 'PAUSED'}
        onPause={() => {
          haptics.runControl();
          engine.pause();
        }}
        onResume={() => {
          haptics.runControl();
          engine.resume();
        }}
        onFinish={() => setConfirming(true)}
      />

      {confirming ? <FinishConfirm engine={engine} summary={summary} onContinue={() => setConfirming(false)} onFinish={finish} onDiscard={discard} /> : null}
    </View>
  );
}

function watchSegmentStrip(attack: SegmentAttack, s: ActiveRunSnapshot, now: number) {
  const fraction = s.course && s.course.lengthM > 0 ? Math.min(1, s.course.progressM / s.course.lengthM) : 0;
  const line = segmentLine(attack, fraction, Math.floor(activeMs(s, now) / 1000));
  return line ? { label: line.label, value: line.value, tone: line.tone } : null;
}

// ---- 위: GPS · 기록 상태 · 지도 전환 ----

function TopBar({ engine, view, onToggleView }: { engine: RunningEngine; view: 'metrics' | 'map'; onToggleView: () => void }) {
  const { colors } = useTheme();
  const gps = useRunSnapshot(engine, (s) => s.gps);
  const status = useRunSnapshot(engine, (s) => s.status);
  const autoPaused = useRunSnapshot(engine, (s) => s.autoPaused);
  const prevGps = useRef(gps);

  useEffect(() => {
    if (gps === 'poor' && prevGps.current !== 'poor') haptics.warning();
    prevGps.current = gps;
  }, [gps]);

  const tag =
    status === 'PAUSED'
      ? { text: autoPaused ? '자동 일시정지' : '일시정지', color: colors.status.warning }
      : status === 'RECOVERY'
        ? { text: '이어서 기록 준비', color: colors.text.secondary }
        : { text: '기록 중', color: colors.action.primary };

  return (
    <View style={styles.topBar}>
      <View style={styles.topLeft}>
        <GpsStatus quality={gps} style={styles.gps} />
        <HeartRate />
      </View>
      <View style={styles.topRight}>
        <View style={styles.tag} accessible accessibilityLabel={tag.text} accessibilityLiveRegion="polite">
          <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
          <AppText role="label" style={[styles.tagText, { color: tag.color }]}>
            {tag.text}
          </AppText>
        </View>
        <AppPressable
          onPress={onToggleView}
          accessibilityLabel={view === 'metrics' ? '지도 보기' : '기록 크게 보기'}
          style={[styles.round, { backgroundColor: colors.bg.surface }]}
        >
          <AppIcon name={view === 'metrics' ? 'map' : 'metrics'} size={20} color={colors.text.primary} />
        </AppPressable>
      </View>
    </View>
  );
}

// 워치에서 받은 심박. 워치가 없거나 15초 넘게 새 값이 없으면 보이지 않는다
function HeartRate() {
  const { colors } = useTheme();
  const bpm = useWatchHeartRate();
  if (bpm == null) return null;
  return (
    <View style={styles.heart} accessible accessibilityLabel={`심박 ${bpm}`}>
      <AppIcon name="health" size={16} color={colors.status.danger} />
      <AppText role="label" tabular style={styles.tagText}>
        {bpm}
      </AppText>
    </View>
  );
}

// ---- 상태 안내 (한 번에 하나). SCREEN-SPECS: GPS poor, offline, recovering ----

function RunNotice({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const status = useRunSnapshot(engine, (s) => s.status);
  const gps = useRunSnapshot(engine, (s) => s.gps);
  const network = useRunSnapshot(engine, (s) => s.network);
  const offRouteM = useRunSnapshot(engine, (s) => s.course?.offRouteM ?? null);
  const completedMs = useRunSnapshot(engine, (s) => s.course?.completedActiveMs ?? null);
  const autoPaused = useRunSnapshot(engine, (s) => s.autoPaused);

  const notice = runNoticeOf({ status, gps, network, offRouteM, completedMs, autoPaused });
  if (!notice) return <View style={styles.noticeSpace} />;

  const color = notice.tone === 'warning' ? colors.status.warning : notice.tone === 'success' ? colors.text.accent : colors.text.secondary;
  return (
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel={notice.text} style={[styles.notice, { backgroundColor: colors.bg.surface }]}>
      <AppIcon name={notice.icon} size={16} color={color} />
      <AppText role="label" style={styles.noticeText}>
        {notice.text}
      </AppText>
    </View>
  );
}

// ---- 지표 (각각 필요한 값만 구독해 초 단위 갱신이 화면 전체를 다시 그리지 않게 한다) ----

function DistanceHero({ engine }: { engine: RunningEngine }) {
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  return <MetricBlock label="킬로미터" value={formatDistanceKm(d)} size="giant" align="center" style={styles.hero} />;
}

function DistanceCompact({ engine }: { engine: RunningEngine }) {
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  return <MetricBlock label="거리" value={formatDistanceKm(d)} unit="km" size="medium" align="center" style={styles.flex} />;
}

function AvgPaceMetric({ engine, size }: { engine: RunningEngine; size: 'large' | 'medium' }) {
  const pace = useRunSnapshot(engine, (s) => s.avgPaceSec);
  return <MetricBlock label="평균 페이스" value={formatPace(pace)} status={pace == null ? 'unavailable' : 'default'} size={size} align="center" style={styles.flex} />;
}

function ElapsedMetric({ engine, size }: { engine: RunningEngine; size: 'large' | 'medium' }) {
  const sec = useElapsedSec(engine);
  return <MetricBlock label="시간" value={formatDuration(sec)} size={size} align="center" style={styles.flex} />;
}

function MapLayer({ engine, courseRoute, ghost }: { engine: RunningEngine; courseRoute: GeoPoint[] | null; ghost: GhostRun | null }) {
  const path = useRunSnapshot(engine, (s) => s.path);
  const position = useRunSnapshot(engine, (s) => s.position);
  const sec = useElapsedSec(engine);
  // 124장: 고스트는 코스 선 위에만 그린다 (다른 사람의 실제 GPS 좌표가 아니라 기록한 시간으로 계산한 코스 위 자리, 129장)
  const ghostAt = ghost && courseRoute && courseRoute.length > 1 ? pointAt(courseRoute, ghostFractionAt(ghost, sec)) : null;
  return <RunPathMap path={path} position={position} course={courseRoute} ghost={ghostAt} />;
}

/** PB 어택 · 도전이면 고스트를 받아 목표에 붙인다. 받기 전 · 실패하면 고스트 없이 */
function useChaseTarget(engine: RunningEngine, courseId: string | null, target: RunTarget | null): RunTarget | null {
  const mode = useRunSnapshot(engine, (s) => s.mode);
  const wanted = target != null && courseId != null && (mode === 'PB' || mode === 'CHALLENGE');
  const recordId = mode === 'CHALLENGE' ? (target?.recordId ?? null) : null;
  const repo = useMemo(() => getRankingRepository('normal'), []);
  const ghost = useQuery({
    queryKey: ['ranking', 'ghost', courseId, recordId],
    queryFn: () => repo.getGhost(courseId!, recordId),
    enabled: wanted && (mode !== 'CHALLENGE' || recordId != null),
    retry: false,
    staleTime: 10 * 60_000,
  });
  const g = ghost.data ?? null;
  return useMemo(() => (target && wanted && g ? { ...target, ghost: g } : target), [target, wanted, g]);
}

// 69장: 코스 이탈은 경고 햅틱 + 음성, 완주는 완주 햅틱. 화면을 보지 않아도 알 수 있게 한다 (62.2장).
function useCourseAlerts(engine: RunningEngine, target: RunTarget | null) {
  const offRoute = useRunSnapshot(engine, (s) => s.course?.offRouteM != null);
  const completedMs = useRunSnapshot(engine, (s) => s.course?.completedActiveMs ?? null);
  const prevOff = useRef(offRoute);
  const prevDone = useRef(completedMs);

  useEffect(() => {
    if (offRoute && !prevOff.current) {
      haptics.warning();
      speak('코스를 벗어났어요. 코스로 돌아가 주세요');
    } else if (!offRoute && prevOff.current) {
      speak('코스로 돌아왔어요');
    }
    prevOff.current = offRoute;
  }, [offRoute]);

  useEffect(() => {
    if (completedMs != null && prevDone.current == null) {
      haptics.complete();
      const sec = Math.round(completedMs / 1000);
      const diff = target ? sec - target.sec : null;
      const vs = diff == null ? '' : diff === 0 ? ' 목표와 같아요' : ` 목표보다 ${formatDurationSpoken(diff)} ${diff < 0 ? '빨라요' : '느려요'}`;
      speak(`코스 완주. 기록 ${formatDurationSpoken(sec)}.${vs}`);
    }
    prevDone.current = completedMs;
  }, [completedMs, target]);
}

// RUN-009: 자동으로 멈추고 이어 갈 때 햅틱 + 음성. 화면을 보지 않아도 기록 상태를 알 수 있게 한다 (62.2장)
function useAutoPauseAlerts(engine: RunningEngine) {
  const autoPaused = useRunSnapshot(engine, (s) => s.autoPaused);
  const status = useRunSnapshot(engine, (s) => s.status);
  const prev = useRef(autoPaused);
  useEffect(() => {
    if (autoPaused && !prev.current) {
      haptics.runControl();
      speak('자동 일시정지');
    } else if (!autoPaused && prev.current && status === 'RUNNING') {
      haptics.runControl();
      speak('다시 기록해요');
    }
    prev.current = autoPaused;
  }, [autoPaused, status]);
}

// ---- 아래: 조작 ----

function Controls({
  paused,
  completed,
  saveLabel,
  disabled,
  onPause,
  onResume,
  onFinish,
  onSave,
}: {
  paused: boolean;
  // 코스 끝에 닿았으면 기록이 정해졌으므로 확인 없이 바로 저장할 수 있다
  completed: boolean;
  saveLabel: string;
  disabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  if (completed && !disabled) {
    return (
      <View style={styles.controlRow}>
        {paused ? null : (
          <AppPressable onPress={onPause} accessibilityLabel="일시정지" style={[styles.control, styles.finish, { backgroundColor: colors.bg.surface }]}>
            <AppIcon name="pause" size={22} color={colors.text.primary} />
            <AppText role="sectionTitle" style={styles.controlText}>
              일시정지
            </AppText>
          </AppPressable>
        )}
        <AppPressable onPress={onSave} accessibilityLabel={saveLabel} style={[styles.control, styles.resume, { backgroundColor: colors.action.primary }]}>
          <AppIcon name="finished" size={22} color={colors.action.onPrimary} />
          <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onPrimary }]}>
            {saveLabel}
          </AppText>
        </AppPressable>
      </View>
    );
  }
  if (!paused) {
    return (
      <AppPressable
        onPress={onPause}
        disabled={disabled}
        accessibilityLabel="일시정지"
        style={[styles.control, { backgroundColor: disabled ? colors.border.subtle : colors.action.secondary }]}
      >
        <AppIcon name="pause" size={24} color={disabled ? colors.text.secondary : colors.action.onSecondary} />
        <AppText role="sectionTitle" style={[styles.controlText, { color: disabled ? colors.text.secondary : colors.action.onSecondary }]}>
          일시정지
        </AppText>
      </AppPressable>
    );
  }
  return (
    <View style={styles.controlRow}>
      <AppPressable onPress={onFinish} accessibilityLabel="종료" style={[styles.control, styles.finish, { backgroundColor: colors.bg.surface }]}>
        <AppIcon name="stop" size={22} color={colors.text.primary} />
        <AppText role="sectionTitle" style={styles.controlText}>
          종료
        </AppText>
      </AppPressable>
      <AppPressable onPress={onResume} accessibilityLabel="계속 달리기" style={[styles.control, styles.resume, { backgroundColor: colors.action.primary }]}>
        <AppIcon name="start" size={24} color={colors.action.onPrimary} />
        <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onPrimary }]}>
          계속 달리기
        </AppText>
      </AppPressable>
    </View>
  );
}

// 이보다 짧으면 "기록하지 않고 끝내기"를 보여 준다 (잘못 시작한 러닝). 길게 달린 기록은 실수로 지우지 않게 숨긴다
const DISCARDABLE_M = 100;
const DISCARDABLE_SEC = 60;

// SCR-R03 러닝 종료: 오입력 방지. 계속 달리기 / 종료 확인 (RUN-010)
function FinishConfirm({
  engine,
  summary,
  onContinue,
  onFinish,
  onDiscard,
}: {
  engine: RunningEngine;
  summary: string;
  onContinue: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  const sec = useElapsedSec(engine);
  const short = d < DISCARDABLE_M || sec < DISCARDABLE_SEC;

  return (
    <View style={styles.scrimWrap}>
      <AppPressable onPress={onContinue} accessibilityLabel="닫고 계속 달리기" feedback="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}
      >
        <AppText role="screenTitle" accessibilityRole="header">
          러닝을 끝낼까요?
        </AppText>
        <AppText role="body" tone="secondary">
          {summary}
        </AppText>
        <View style={styles.confirmStats}>
          <AppText role="metricLarge" tabular>
            {formatDistanceKm(d)}
            <AppText role="sectionTitle" tone="secondary">
              {' '}
              km
            </AppText>
          </AppText>
          <AppText role="metricLarge" tabular>
            {formatDuration(sec)}
          </AppText>
        </View>
        <View style={styles.controlRow}>
          <AppPressable onPress={onContinue} accessibilityLabel="계속 달리기" style={[styles.control, styles.finish, { backgroundColor: colors.bg.surface }]}>
            <AppText role="sectionTitle" style={styles.controlText}>
              계속 달리기
            </AppText>
          </AppPressable>
          <AppPressable onPress={onFinish} accessibilityLabel="종료하고 기록 저장" style={[styles.control, styles.resume, { backgroundColor: colors.action.primary }]}>
            <AppIcon name="stop" size={22} color={colors.action.onPrimary} />
            <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onPrimary }]}>
              종료하기
            </AppText>
          </AppPressable>
        </View>
        {short ? (
          <AppPressable onPress={onDiscard} accessibilityRole="button" accessibilityLabel="기록하지 않고 끝내기" style={styles.discard}>
            <AppText role="label" tone="secondary" style={styles.discardText}>
              기록하지 않고 끝내기
            </AppText>
          </AppPressable>
        ) : null}
      </View>
    </View>
  );
}

// 종료 처리 중(finish pending) · 오프라인이면 기기에만 저장된 결과(local-only)
function FinishingView({ engine, result, onOpenResult }: { engine: RunningEngine; result: RunFinishResult | null; onOpenResult: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unsynced = useRunSnapshot(engine, (s) => s.unsyncedPoints);
  const localOnly = result != null && !result.synced;

  return (
    <View style={[styles.root, styles.finishing, { backgroundColor: colors.bg.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.finishingBody} accessibilityLiveRegion="polite">
        {localOnly ? (
          <View style={[styles.offlineIcon, { backgroundColor: colors.bg.surface }]}>
            <AppIcon name="offline" size={28} color={colors.text.primary} />
          </View>
        ) : (
          <BrandLoader size={56} label="기록 저장 중" />
        )}
        <AppText role="screenTitle" style={styles.center}>
          {localOnly ? '기록은 휴대폰에 저장했어요' : '기록 저장 중'}
        </AppText>
        <AppText role="body" tone="secondary" style={styles.center}>
          {localOnly ? '인터넷에 연결되면 자동으로 올려요. 올리기 전까지 랭킹에는 반영되지 않아요.' : unsynced > 0 ? `남은 기록 ${unsynced}개를 올리고 있어요` : '결과를 만들고 있어요'}
        </AppText>
      </View>
      {localOnly && result ? (
        <AppPressable onPress={onOpenResult} accessibilityLabel="결과 보기" style={[styles.control, { backgroundColor: colors.action.primary }]}>
          <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onPrimary }]}>
            결과 보기
          </AppText>
        </AppPressable>
      ) : null}
    </View>
  );
}

const CONTROL_H = 64;

const styles = StyleSheet.create({
  discard: {
    minHeight: touchTarget.min,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  discardText: {
    textDecorationLine: 'underline',
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  topBar: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gps: {
    alignSelf: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagText: {
    fontFamily: fontFamily.bold,
  },
  round: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.control,
  },
  noticeText: {
    flex: 1,
    fontFamily: fontFamily.bold,
  },
  noticeSpace: {
    height: 0,
  },
  metrics: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  hero: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  mapView: {
    flex: 1,
    gap: spacing.lg,
  },
  mapFrame: {
    flex: 1,
    borderRadius: radius.sheet,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  control: {
    minHeight: CONTROL_H,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  finish: {
    flex: 1,
  },
  resume: {
    flex: 1.6,
  },
  controlText: {
    fontFamily: fontFamily.extrabold,
  },
  scrimWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  confirmStats: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginVertical: spacing.sm,
  },
  finishing: {
    justifyContent: 'space-between',
  },
  finishingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  offlineIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
