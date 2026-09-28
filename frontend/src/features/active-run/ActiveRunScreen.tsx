import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { GpsStatus } from '@/components/GpsStatus';
import { MetricBlock } from '@/components/MetricBlock';
import { SignalRail } from '@/components/SignalRail';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { endActiveRun, useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { activeMs, type RunFinishResult, type RunningEngine } from '@/features/run/engine/runningEngine';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';
import { haptics } from '@/shared/haptics';

import { RunPathMap } from './components/RunPathMap';

// SCR-R02 Active Run 공통 Run Shell (72장 6번, FREE). 92장 레이아웃:
// 위 GPS·기록 상태 → 가운데 giant 거리 → 시간·평균 페이스 → 모드별 강조 strip 하나 → 아래 넓은 일시정지.
// 모드별 패널(진행률·gap)은 7번 단계에서 strip 자리에 끼운다.
export function ActiveRunScreen({ engine, summary }: { engine: RunningEngine; summary: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useRunSnapshot(engine, (s) => s.status);
  const [view, setView] = useState<'metrics' | 'map'>('metrics');
  const [confirming, setConfirming] = useState(false);
  const [finished, setFinished] = useState<RunFinishResult | null>(null);

  // 러닝 중 Android 뒤로 가기로 화면을 벗어나지 않게 한다 (종료는 일시정지 → 종료 확인으로만)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const finish = async () => {
    setConfirming(false);
    const result = await engine.finish();
    setFinished(result);
    // 동기화까지 끝나면 결과로 넘어간다. 오프라인이면 안내를 보여주고 사용자가 결과를 연다.
    if (result.synced) openResult(result);
  };

  const openResult = (r: RunFinishResult) => {
    endActiveRun();
    router.replace({
      pathname: '/run/result',
      params: {
        mode: r.mode,
        distanceM: String(Math.round(r.distanceM)),
        activeSec: String(r.activeSec),
        ...(r.avgPaceSec != null ? { avgPaceSec: String(Math.round(r.avgPaceSec)) } : {}),
        synced: r.synced ? '1' : '0',
      },
    });
  };

  if (status === 'FINISHING' || status === 'FINISHED') {
    return <FinishingView engine={engine} result={finished} onOpenResult={openResult} />;
  }

  const paused = status === 'PAUSED';
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <TopBar engine={engine} view={view} onToggleView={() => setView((v) => (v === 'metrics' ? 'map' : 'metrics'))} />
      <RunNotice engine={engine} />

      {view === 'metrics' ? (
        <View style={styles.metrics}>
          <DistanceHero engine={engine} />
          <View style={styles.row}>
            <ElapsedMetric engine={engine} size="large" />
            <AvgPaceMetric engine={engine} size="large" />
          </View>
          <SplitStrip engine={engine} />
        </View>
      ) : (
        <View style={styles.mapView}>
          <View style={[styles.mapFrame, { borderColor: colors.border.subtle }]}>
            <MapLayer engine={engine} />
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

      {confirming ? <FinishConfirm engine={engine} summary={summary} onContinue={() => setConfirming(false)} onFinish={finish} /> : null}
    </View>
  );
}

// ---- 위: GPS · 기록 상태 · 지도 전환 ----

function TopBar({ engine, view, onToggleView }: { engine: RunningEngine; view: 'metrics' | 'map'; onToggleView: () => void }) {
  const { colors } = useTheme();
  const gps = useRunSnapshot(engine, (s) => s.gps);
  const status = useRunSnapshot(engine, (s) => s.status);
  const prevGps = useRef(gps);

  useEffect(() => {
    if (gps === 'poor' && prevGps.current !== 'poor') haptics.warning();
    prevGps.current = gps;
  }, [gps]);

  const tag =
    status === 'PAUSED'
      ? { text: '일시정지', color: colors.status.warning }
      : status === 'RECOVERY'
        ? { text: '이어서 기록 준비', color: colors.text.secondary }
        : { text: '기록 중', color: colors.action.primary };

  return (
    <View style={styles.topBar}>
      <GpsStatus quality={gps} style={styles.gps} />
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

// ---- 상태 안내 (한 번에 하나). SCREEN-SPECS: GPS poor, offline, recovering ----

function RunNotice({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const status = useRunSnapshot(engine, (s) => s.status);
  const gps = useRunSnapshot(engine, (s) => s.gps);
  const network = useRunSnapshot(engine, (s) => s.network);

  let notice: { icon: IconName; text: string; tone: 'warning' | 'neutral' } | null = null;
  if (status === 'RECOVERY') notice = { icon: 'gpsAcquiring', text: '앱이 꺼지기 전 기록을 불러왔어요. GPS를 다시 찾는 중이에요', tone: 'neutral' };
  else if (gps === 'poor') notice = { icon: 'gpsPoor', text: 'GPS 신호가 약해 거리를 잠시 세지 않아요', tone: 'warning' };
  else if (network === 'offline') notice = { icon: 'offline', text: '오프라인이에요. 기록은 휴대폰에 저장하고 있어요', tone: 'neutral' };
  if (!notice) return <View style={styles.noticeSpace} />;

  const color = notice.tone === 'warning' ? colors.status.warning : colors.text.secondary;
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

function useElapsedSec(engine: RunningEngine) {
  const base = useRunSnapshot(engine, (s) => s.activeMsBase);
  const since = useRunSnapshot(engine, (s) => s.runningSince);
  const read = () => Math.floor(activeMs({ activeMsBase: base, runningSince: since }, engine.now()) / 1000);
  const [sec, setSec] = useState(read);

  useEffect(() => {
    const update = () => setSec(Math.floor(activeMs({ activeMsBase: base, runningSince: since }, engine.now()) / 1000));
    update();
    if (since == null) return;
    const t = setInterval(update, 250);
    return () => clearInterval(t);
  }, [base, since, engine]);

  return sec;
}

// FREE 강조 strip: 다음 1km까지 진행 + 현재 페이스 + 지난 1km 스플릿 (92장 "FREE에서는 split")
function SplitStrip({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  const splits = useRunSnapshot(engine, (s) => s.splits);
  const current = useRunSnapshot(engine, (s) => s.currentPaceSec);
  const last = splits[splits.length - 1] ?? null;
  const nextKm = Math.floor(d / 1000) + 1;
  const toNext = Math.max(0, nextKm * 1000 - d);

  return (
    <View style={[styles.strip, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.stripRow}>
        <View accessible accessibilityLabel={`현재 페이스 ${current == null ? '측정 중' : formatPace(current)}`}>
          <AppText role="caption" tone="secondary">
            현재 페이스
          </AppText>
          <AppText role="sectionTitle" tabular style={styles.stripValue}>
            {formatPace(current)}
          </AppText>
        </View>
        <View style={styles.stripRight} accessible accessibilityLabel={last ? `${last.km}킬로미터 구간 ${formatDuration(last.sec)}` : '첫 1킬로미터 구간 측정 중'}>
          <AppText role="caption" tone="secondary">
            {last ? `${last.km}km 구간` : '첫 1km 구간'}
          </AppText>
          <AppText role="sectionTitle" tabular tone={last ? 'accent' : 'secondary'} style={styles.stripValue}>
            {last ? formatDuration(last.sec) : '--'}
          </AppText>
        </View>
      </View>
      <SignalRail progress={(d % 1000) / 1000} showHead />
      <AppText role="caption" tone="secondary" tabular>
        {nextKm}km까지 {Math.round(toNext)}m
      </AppText>
    </View>
  );
}

function MapLayer({ engine }: { engine: RunningEngine }) {
  const path = useRunSnapshot(engine, (s) => s.path);
  const position = useRunSnapshot(engine, (s) => s.position);
  return <RunPathMap path={path} position={position} />;
}

// ---- 아래: 조작 ----

function Controls({
  paused,
  disabled,
  onPause,
  onResume,
  onFinish,
}: {
  paused: boolean;
  disabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const { colors } = useTheme();
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

// SCR-R03 러닝 종료: 오입력 방지. 계속 달리기 / 종료 확인 (RUN-010)
function FinishConfirm({ engine, summary, onContinue, onFinish }: { engine: RunningEngine; summary: string; onContinue: () => void; onFinish: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const d = useRunSnapshot(engine, (s) => s.distanceM);
  const sec = useElapsedSec(engine);

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
      </View>
    </View>
  );
}

// 종료 처리 중(finish pending) · 오프라인이면 기기에만 저장된 결과(local-only)
function FinishingView({ engine, result, onOpenResult }: { engine: RunningEngine; result: RunFinishResult | null; onOpenResult: (r: RunFinishResult) => void }) {
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
        <AppPressable onPress={() => onOpenResult(result)} accessibilityLabel="결과 보기" style={[styles.control, { backgroundColor: colors.action.primary }]}>
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
  strip: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stripRight: {
    alignItems: 'flex-end',
  },
  stripValue: {
    fontFamily: fontFamily.extrabold,
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
