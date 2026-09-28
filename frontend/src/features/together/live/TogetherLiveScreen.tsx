import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { ParticipantChip } from '@/components/ParticipantChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { LiveChannel } from '@/entities/live/api/liveChannel';
import { createMockLiveChannel, type LiveRunScenario } from '@/entities/live/api/mockLiveChannel';
import { createMockLiveRoomRepository } from '@/entities/live/api/mockLiveRoomRepository';
import type { LiveMemberState, LiveRoom } from '@/entities/live/types';
import { runResultRepository } from '@/entities/run/api';
import { getRunPolicySync } from '@/entities/run/policy';
import { useElapsedSec } from '@/features/active-run/useElapsedSec';
import { beginActiveRun, endActiveRun, useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { useSplitAnnouncer } from '@/features/run/voice/useSplitAnnouncer';
import { activeMs } from '@/features/run/engine/runningEngine';
import { formatDistanceKm, formatDuration, formatDurationSpoken, formatPace } from '@/shared/format';
import { haptics } from '@/shared/haptics';

import { goalLabel, participantStatus } from '../labels';
import { distanceGap, myRank, orderMembers } from './liveRank';

type Props = { roomId: string; scenario: LiveRunScenario; speed: number };

// SCR-T04 Together Live (TGT-005~010). 94장 레이아웃:
// 목표 · 참가 인원 → 내 순위와 거리(self metric 항상 고정) → 참가자 가상 진행 rail → 선두와 차이 · 평균 페이스 → 일시정지.
// 89장: dark, 실제 지도 위 친구 marker 금지. 상대 GPS 좌표는 모델에 없다 (94장). 레퍼런스 Zwift + Runky.
export function TogetherLiveScreen(props: Props) {
  return (
    <ThemeProvider scheme="dark">
      <Live {...props} />
    </ThemeProvider>
  );
}

function Live({ roomId, scenario, speed }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => createMockLiveRoomRepository('normal'), []);
  const room = useQuery({ queryKey: ['live', 'room', roomId, 'live'], queryFn: () => repo.get(roomId), retry: false, staleTime: Infinity });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />
      {room.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="방에 연결하는 중" />
        </View>
      ) : !room.data ? (
        <StateNotice
          icon="warning"
          tone="warning"
          title="방에 연결하지 못했어요"
          body="방이 끝났거나 없어졌어요."
          actions={<SecondaryButton label="함께 달리기로" size="sm" onPress={() => router.dismissTo('/together')} />}
        />
      ) : (
        <LiveRun room={room.data} scenario={scenario} speed={speed} />
      )}
    </View>
  );
}

function LiveRun({ room, scenario, speed }: { room: LiveRoom; scenario: LiveRunScenario; speed: number }) {
  const { colors } = useTheme();
  // 개인 Run은 항상 만든다 (45.1장). 내 기록은 러닝 엔진이, 다른 사람 상태는 Live 채널이 준다.
  const [engine] = useState(() => beginActiveRun({ kind: 'mock', scenario: 'normal', speed }));
  const [channel] = useState<LiveChannel>(() => createMockLiveChannel({ room, scenario, now: engine.now, speed }));
  const [members, setMembers] = useState<LiveMemberState[]>([]);
  const [connected, setConnected] = useState(true);
  const [mine, setMine] = useState<'RUNNING' | 'FINISHED' | 'DNF'>('RUNNING');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const status = useRunSnapshot(engine, (s) => s.status);
  const distanceM = useRunSnapshot(engine, (s) => s.distanceM);
  const avgPace = useRunSnapshot(engine, (s) => s.avgPaceSec);
  const elapsed = useElapsedSec(engine);
  // Together에서도 내 구간 안내는 같다 (AUD-001)
  useSplitAnnouncer(engine);
  const ending = useRef(false);

  // 러닝 중 뒤로 가기로 빠지지 않게 한다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // 대기실 카운트다운이 끝난 뒤 들어오므로 바로 기록을 시작하고 채널에 붙는다
  useEffect(() => {
    engine.prepare({ mode: room.mode }).then(() => engine.start());
    channel.connect((e) => {
      if (e.type === 'MEMBER_STATE') setMembers(e.members);
      else if (e.type === 'CONNECTION') setConnected(e.connected);
      else if (e.type === 'ROOM_FINISHED') {
        haptics.complete();
        endActiveRun();
        router.replace({ pathname: '/together/[roomId]/result', params: { roomId: room.id } });
      }
    });
    return () => channel.close();
    // 방에 들어올 때 한 번만 붙는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내 상태를 run.live_state_interval_sec마다 보낸다 (46장 RUN_STATE)
  useEffect(() => {
    if (mine !== 'RUNNING') return;
    const send = () => {
      const s = engine.getSnapshot();
      channel.sendState({ distanceM: s.distanceM, elapsedSec: activeMs(s, engine.now()) / 1000, paceSec: s.avgPaceSec, status: 'RUNNING' });
    };
    send();
    const t = setInterval(send, Math.max(100, (getRunPolicySync().liveStateIntervalSec * 1000) / speed));
    return () => clearInterval(t);
  }, [channel, engine, mine, speed]);

  // 내가 끝나는 조건: 레이스·함께는 목표 거리, 타임 어택은 목표 시간
  const reached = (room.targetDistanceM != null && distanceM >= room.targetDistanceM) || (room.targetSeconds != null && elapsed >= room.targetSeconds);
  const end = async (kind: 'FINISHED' | 'DNF') => {
    if (ending.current) return;
    ending.current = true;
    setMine(kind);
    if (kind === 'FINISHED') haptics.complete();
    const r = await engine.finish();
    const runId = await runResultRepository.saveFinished(
      { clientRunUuid: r.clientRunUuid, startedAt: r.startedAt, mode: room.mode, distanceM: r.distanceM, activeSec: r.activeSec, avgPaceSec: r.avgPaceSec, splits: r.splits, path: r.path, course: null, target: null },
      r.synced,
    );
    channel.sendState({ distanceM: room.targetDistanceM != null && kind === 'FINISHED' ? room.targetDistanceM : r.distanceM, elapsedSec: r.activeSec, paceSec: r.avgPaceSec, status: kind, runId });
  };
  useEffect(() => {
    if (reached && mine === 'RUNNING') end('FINISHED');
    // end는 이 조건에서만 부른다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, mine]);

  // 순위가 바뀌면 가벼운 햅틱 (69장 Rank change). 중도 포기하면 순위에서 빠진다.
  const rank = mine === 'DNF' ? null : myRank(room.mode, members);
  const prevRank = useRef<number | null>(null);
  useEffect(() => {
    if (rank != null && prevRank.current != null && rank !== prevRank.current && mine === 'RUNNING') haptics.countdownTick();
    prevRank.current = rank;
  }, [rank, mine]);

  const me: LiveMemberState = members.find((m) => m.isMe) ?? { userId: 'me', name: '나', isMe: true, status: 'RUNNING', distanceM, elapsedSec: elapsed, paceSec: avgPace, finishSec: null };
  const meNow: LiveMemberState = { ...me, distanceM: mine === 'RUNNING' ? distanceM : me.distanceM };
  const ordered = orderMembers(room.mode, members.length ? members.map((m) => (m.isMe ? meNow : m)) : [meNow]);
  const running = ordered.filter((m) => m.status === 'RUNNING' || m.status === 'DISCONNECTED').length;
  const leader = ordered[0];
  const paused = status === 'PAUSED';

  return (
    <>
      <View style={styles.top}>
        <AppText role="label" style={styles.bold}>
          {goalLabel(room)}
        </AppText>
        <View style={styles.row} accessible accessibilityLabel={`${ordered.length}명 중 ${running}명 달리는 중, ${connected ? '연결됨' : '연결 끊김'}`}>
          <View style={[styles.dot, { backgroundColor: connected ? colors.action.primary : colors.status.warning }]} />
          <AppText role="label" tone="secondary" tabular>
            {running}/{ordered.length}명 달리는 중
          </AppText>
        </View>
      </View>

      {!connected ? (
        <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
          <AppIcon name="offline" size={16} color={colors.status.warning} />
          <AppText role="label" style={[styles.bold, styles.flex]}>
            연결이 끊겼어요. 내 기록은 계속되고, 다시 연결되면 순위를 맞춰요
          </AppText>
        </View>
      ) : paused ? (
        <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
          <AppIcon name="pause" size={16} color={colors.text.primary} />
          <AppText role="label" style={[styles.bold, styles.flex]}>
            일시정지 중이에요. 다른 참가자는 계속 달려요
          </AppText>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* self metric 항상 고정 (89장) */}
        <View style={styles.hero} accessible accessibilityLabel={heroLabel(room, rank, ordered.length, meNow, elapsed)} accessibilityLiveRegion="polite">
          {rank != null ? (
            <View style={styles.rankLine}>
              <AppText role="metricGiant" tone="accent" tabular>
                {rank}
              </AppText>
              <AppText role="screenTitle">위</AppText>
              <AppText role="label" tone="secondary" tabular>
                {' '}/ {ordered.length}명
              </AppText>
            </View>
          ) : null}
          <AppText role={rank != null ? 'metricLarge' : 'metricGiant'} tabular>
            {formatDistanceKm(meNow.distanceM)}
            <AppText role="sectionTitle" tone="secondary" tabular>
              {room.targetDistanceM != null ? ` / ${formatDistanceKm(room.targetDistanceM)} km` : ' km'}
            </AppText>
          </AppText>
          {room.targetSeconds != null ? (
            <AppText role="sectionTitle" tone="secondary" tabular>
              남은 시간 {formatDuration(Math.max(0, room.targetSeconds - elapsed))}
            </AppText>
          ) : room.mode === 'TOGETHER' ? (
            <AppText role="sectionTitle" tone="secondary" tabular>
              함께 달린 시간 {formatDuration(elapsed)}
            </AppText>
          ) : null}
        </View>

        {/* 참가자 가상 진행. 실제 위치 대신 진행률과 나와의 거리 차이 (94장) */}
        <View style={styles.rails}>
          {ordered.map((m) => (
            <View key={m.userId} style={[styles.rail, m.isMe && { backgroundColor: colors.action.tint }]}>
              <ParticipantChip
                name={m.isMe ? `${m.name} (나)` : m.name}
                status={participantStatus(m.status)}
                progress={progressOf(room, m, leader)}
                trailing={trailingOf(room, m, meNow)}
              />
            </View>
          ))}
        </View>

        <View style={[styles.strip, { backgroundColor: colors.bg.surface }]}>
          {/* 중도 포기한 뒤에는 선두와의 차이가 의미 없다 */}
          {mine !== 'DNF' ? (
            <AppText role="sectionTitle" style={styles.bold}>
              {gapCopy(room, ordered, meNow, avgPace)}
            </AppText>
          ) : null}
          <AppText role="label" tone="secondary" tabular>
            평균 {formatPace(avgPace)}/km · {formatDuration(elapsed)}
          </AppText>
        </View>
      </ScrollView>

      {mine !== 'RUNNING' ? (
        <View style={[styles.waiting, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
          <BrandLoader size={28} label="다른 참가자를 기다리는 중" />
          <View style={styles.flex}>
            <AppText role="label" style={styles.bold}>
              {mine === 'FINISHED' ? `${room.targetSeconds != null ? '시간 종료' : '완주'} · ${formatDuration(elapsed)}` : '중도 포기했어요'}
            </AppText>
            <AppText role="caption" tone="secondary">
              모두 끝나면 결과가 나와요
            </AppText>
          </View>
        </View>
      ) : paused ? (
        <View style={styles.controlRow}>
          <AppPressable onPress={() => setConfirmQuit(true)} accessibilityLabel="그만두기" style={[styles.control, styles.flex, { backgroundColor: colors.bg.surface }]}>
            <AppIcon name="stop" size={22} color={colors.text.primary} />
            <AppText role="sectionTitle" style={styles.controlText}>
              그만두기
            </AppText>
          </AppPressable>
          <AppPressable
            onPress={() => {
              haptics.runControl();
              engine.resume();
            }}
            accessibilityLabel="계속 달리기"
            style={[styles.control, styles.resume, { backgroundColor: colors.action.primary }]}
          >
            <AppIcon name="start" size={24} color={colors.action.onPrimary} />
            <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onPrimary }]}>
              계속 달리기
            </AppText>
          </AppPressable>
        </View>
      ) : (
        <AppPressable
          onPress={() => {
            haptics.runControl();
            engine.pause();
          }}
          accessibilityLabel="일시정지"
          style={[styles.control, { backgroundColor: colors.action.secondary }]}
        >
          <AppIcon name="pause" size={24} color={colors.action.onSecondary} />
          <AppText role="sectionTitle" style={[styles.controlText, { color: colors.action.onSecondary }]}>
            일시정지
          </AppText>
        </AppPressable>
      )}

      {confirmQuit ? <QuitSheet mode={room.mode} onStay={() => setConfirmQuit(false)} onQuit={() => (setConfirmQuit(false), end('DNF'))} /> : null}
    </>
  );
}

// TGT-011 나가기/DNF 확인
function QuitSheet({ mode, onStay, onQuit }: { mode: LiveRoom['mode']; onStay: () => void; onQuit: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.scrim}>
      <AppPressable onPress={onStay} feedback="none" accessibilityLabel="닫고 계속 달리기" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: insets.bottom + spacing.lg, boxShadow: elevation.sheet }]}>
        <AppText role="screenTitle" accessibilityRole="header">
          그만둘까요?
        </AppText>
        <AppText role="body" tone="secondary">
          {mode === 'TOGETHER' ? '지금까지 달린 기록은 내 기록으로 남아요.' : '중도 포기로 기록되고 순위에서 빠져요. 지금까지 달린 기록은 내 기록으로 남아요.'}
        </AppText>
        <View style={styles.controlRow}>
          <SecondaryButton label="계속 달리기" onPress={onStay} style={styles.flex} />
          <SecondaryButton label="그만두기" emphasized onPress={onQuit} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

function progressOf(room: LiveRoom, m: LiveMemberState, leader: LiveMemberState | undefined) {
  if (room.targetDistanceM != null) return m.distanceM / room.targetDistanceM;
  // 타임 어택은 목표 거리가 없어 가장 멀리 간 사람을 끝으로 본다
  return leader && leader.distanceM > 0 ? m.distanceM / leader.distanceM : 0;
}

function trailingOf(room: LiveRoom, m: LiveMemberState, me: LiveMemberState) {
  if (m.status === 'FINISHED' && m.finishSec != null) return `완주 ${formatDuration(m.finishSec)}`;
  if (m.status === 'DNF') return undefined;
  if (m.isMe) return `${formatDistanceKm(me.distanceM)}km`;
  return distanceGap(m, me);
}

function gapCopy(room: LiveRoom, ordered: LiveMemberState[], me: LiveMemberState, pace: number | null) {
  if (room.mode === 'TOGETHER') {
    const others = ordered.filter((m) => !m.isMe && m.status !== 'DNF');
    return others.length ? `함께 ${others.length + 1}명이 달리고 있어요` : '함께 달리고 있어요';
  }
  const i = ordered.findIndex((m) => m.isMe);
  if (i === 0) {
    const next = ordered[1];
    return next ? `2위와 ${Math.max(0, Math.round(me.distanceM - next.distanceM))}m 앞서요` : '선두예요';
  }
  const leader = ordered[0];
  if (leader.status === 'FINISHED' && room.mode === 'LIVE_RACE') return `선두 ${leader.name}님이 완주했어요`;
  const gapM = Math.max(0, leader.distanceM - me.distanceM);
  // 거리 차이를 내 평균 페이스로 시간으로 바꿔 보여준다
  return pace != null ? `선두와 ${formatDurationSpoken((gapM / 1000) * pace)} 차이` : `선두와 ${Math.round(gapM)}m 차이`;
}

function heroLabel(room: LiveRoom, rank: number | null, total: number, me: LiveMemberState, elapsed: number) {
  return [rank != null ? `${total}명 중 ${rank}위` : null, `${formatDistanceKm(me.distanceM)}킬로미터`, room.targetSeconds != null ? `남은 시간 ${formatDurationSpoken(Math.max(0, room.targetSeconds - elapsed))}` : null]
    .filter(Boolean)
    .join(', ');
}

const CONTROL_H = 64;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  scroll: {
    gap: spacing.xl,
    paddingBottom: spacing.lg,
  },
  hero: {
    gap: spacing.xs,
  },
  rankLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  rails: {
    gap: spacing.xs,
  },
  rail: {
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  strip: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    padding: spacing.lg,
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
  resume: {
    flex: 1.6,
  },
  controlText: {
    fontFamily: fontFamily.extrabold,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
});

