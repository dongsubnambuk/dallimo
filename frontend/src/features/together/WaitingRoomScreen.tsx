import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { GpsStatus } from '@/components/GpsStatus';
import { ParticipantChip } from '@/components/ParticipantChip';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { ThemeProvider, useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { LiveRoomError } from '@/entities/live/api/liveRoomRepository';
import { liveRoomRepositoryFor } from '@/entities/live/api';
import type { LiveScenario } from '@/entities/live/api/mockLiveRoomRepository';
import { getShareRepository } from '@/entities/share/api';
import type { LiveMember, LiveRoom } from '@/entities/live/types';
import { haptics } from '@/shared/haptics';
import type { GpsQuality } from '@/shared/location/locationSource';
import { createMockLocationSource } from '@/shared/location/mockLocationSource';
import { useNow } from '@/shared/useNow';

import { askNotifications } from '@/features/notifications/push';

import { InviteFriendsSheet } from './InviteFriendsSheet';
import { syncLiveReminder } from './liveReminders';
import { goalLabel, goalValue, MODE_INFO, participantStatus, startLabel } from './labels';

// 대기실은 WebSocket ROOM_SNAPSHOT이 붙기 전까지 방 snapshot을 1초마다 다시 읽는다
const POLL_MS = 1000;
const MEMBER_ORDER: Record<LiveMember['status'], number> = { READY: 0, JOINED: 1, DISCONNECTED: 2, INVITED: 3, RUNNING: 4, FINISHED: 5, DNF: 6 };

// SCR-T03 Waiting Room (TGT-003~004): 참가자, READY, GPS/Network, 카운트다운.
// 89장 Together Lobby "room goal + participant readiness가 핵심, 채팅창 없음, 메신저 room처럼 구성하지 않는다".
// 출발 직전 화면이라 Run Ready와 같은 dark pre-run canvas를 쓴다.
// invite: 초대 링크로 들어왔을 때의 share_code. 참가하기 전 방을 보고 참가할 때 쓴다
export function WaitingRoomScreen({ roomId, scenario, invite }: { roomId: string; scenario: LiveScenario; invite?: string | null }) {
  return (
    <ThemeProvider scheme="dark">
      <WaitingRoom roomId={roomId} scenario={scenario} invite={invite ?? null} />
    </ThemeProvider>
  );
}

function WaitingRoom({ roomId, scenario, invite }: { roomId: string; scenario: LiveScenario; invite: string | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const repo = useMemo(() => liveRoomRepositoryFor(roomId, scenario), [roomId, scenario]);
  const key = ['live', 'room', roomId, scenario];
  const room = useQuery({
    queryKey: key,
    queryFn: () => repo.get(roomId, invite),
    refetchInterval: (q) => (q.state.data && (q.state.data.status === 'WAITING' || q.state.data.status === 'READY') ? POLL_MS : false),
    retry: (n, e) => !(e instanceof LiveRoomError && e.kind === 'notFound') && n < 30,
    retryDelay: POLL_MS,
  });
  const setRoom = (r: LiveRoom) => qc.setQueryData(key, r);
  // 예약 방에 참가했으면 시작 10분 전 휴대폰 알림, 나가거나 취소 · 시작되면 지운다
  const reminderKey = room.data ? `${room.data.status}:${room.data.scheduledAt}:${room.data.members.find((m) => m.isMe)?.status}` : null;
  useEffect(() => {
    if (room.data && /^\d+$/.test(room.data.id)) syncLiveReminder(room.data);
    // 방 상태 · 예약 시각 · 내 참가 상태가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderKey]);
  const ready = useMutation({ mutationFn: (v: boolean) => repo.setReady(roomId, v), onSuccess: setRoom });
  // 참가할 때 알림 권한을 묻는다 (취소 · 시작 10분 전)
  const join = useMutation({ mutationFn: () => repo.join(roomId, invite), onSuccess: (r) => (setRoom(r), void askNotifications()) });
  // 방장은 방을 취소(POST /cancel), 참가자는 나가기(POST /leave)
  const leave = useMutation({
    mutationFn: () => (room.data?.members.find((m) => m.isMe)?.isHost ? repo.cancel(roomId) : repo.leave(roomId)),
    onSuccess: () => router.dismissTo('/together'),
  });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [inviting, setInviting] = useState(false);
  const gps = useMyGps();

  const goHome = () => router.dismissTo('/together');

  let body;
  if (room.isPending) {
    body = (
      <View style={styles.center}>
        <BrandLoader size={48} label="방 불러오는 중" />
      </View>
    );
  } else if (!room.data) {
    const notFound = room.error instanceof LiveRoomError && room.error.kind === 'notFound';
    body = (
      <View style={styles.pad}>
        <StateNotice
          icon="warning"
          tone="warning"
          title={notFound ? '방을 찾을 수 없어요' : '방에 연결하지 못했어요'}
          body={notFound ? '방이 취소됐거나 이미 끝났어요.' : '연결을 확인하고 다시 시도해 주세요.'}
          actions={<SecondaryButton label={notFound ? '함께 달리기로' : '다시 시도'} size="sm" onPress={notFound ? goHome : () => room.refetch()} />}
        />
      </View>
    );
  } else if (room.data.status === 'CANCELED') {
    body = (
      <View style={styles.pad}>
        <StateNotice icon="rejected" title="방이 취소됐어요" body="방장이 방을 취소했어요." actions={<SecondaryButton label="함께 달리기로" size="sm" onPress={goHome} />} />
      </View>
    );
  } else {
    body = (
      <RoomBody
        room={room.data}
        gps={gps}
        // 받아 둔 방이 있는데 새로 읽기에 실패하면 다시 연결 중
        reconnecting={room.isError || room.failureCount > 0}
        busy={ready.isPending || join.isPending}
        onReady={(v) => ready.mutate(v)}
        onJoin={() => join.mutate()}
        onInvite={() => setInviting(true)}
        bottomInset={insets.bottom}
      />
    );
  }

  const me = room.data?.members.find((m) => m.isMe);
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <AppPressable onPress={() => (room.data && room.data.status !== 'CANCELED' ? setConfirmLeave(true) : goHome())} accessibilityLabel="방 나가기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="close" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="label" tone="secondary" style={styles.bold}>
          대기실
        </AppText>
        {room.data && room.data.status !== 'CANCELED' ? (
          <AppPressable onPress={() => shareInvite(room.data!)} accessibilityLabel="초대 링크 보내기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
            <AppIcon name="share" size={20} color={colors.text.primary} />
          </AppPressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>
      {body}
      {inviting && room.data ? (
        <InviteFriendsSheet room={room.data} repo={repo} onInvited={setRoom} onClose={() => setInviting(false)} bottomInset={insets.bottom} />
      ) : null}
      {confirmLeave ? (
        <LeaveSheet
          invited={me?.status === 'INVITED'}
          host={!!me?.isHost}
          busy={leave.isPending}
          onStay={() => setConfirmLeave(false)}
          onLeave={() => leave.mutate()}
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}

function RoomBody({
  room,
  gps,
  reconnecting,
  busy,
  onReady,
  onJoin,
  onInvite,
  bottomInset,
}: {
  room: LiveRoom;
  gps: GpsQuality;
  reconnecting: boolean;
  busy: boolean;
  onReady: (v: boolean) => void;
  onJoin: () => void;
  onInvite: () => void;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  const me = room.members.find((m) => m.isMe)!;
  const members = [...room.members].sort((a, b) => Number(b.isMe) - Number(a.isMe) || MEMBER_ORDER[a.status] - MEMBER_ORDER[b.status]);
  const joined = room.members.filter((m) => m.status !== 'INVITED');
  const readyCount = room.members.filter((m) => m.status === 'READY').length;
  const counting = room.startsAt != null;
  const info = MODE_INFO[room.mode];

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        {reconnecting ? (
          <View style={[styles.notice, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
            <AppIcon name="offline" size={16} color={colors.status.warning} />
            <AppText role="label" style={styles.bold}>
              연결이 끊겼어요. 다시 연결하는 중이에요
            </AppText>
          </View>
        ) : null}

        {/* 방 목표 */}
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.action.tint }]}>
              <AppIcon name={info.icon} size={14} color={colors.text.accent} />
              <AppText role="label" tone="accent" style={styles.bold}>
                {info.title}
              </AppText>
            </View>
            <AppText role="caption" tone="secondary">
              {info.caption}
            </AppText>
          </View>
          {counting ? <Countdown room={room} /> : <AppText role="metricHero" tabular accessibilityLabel={goalLabel(room)}>{goalValue(room)}</AppText>}
          {room.course ? (
            <AppText role="label" tone="secondary">
              코스 · {room.course.name}
            </AppText>
          ) : null}
          {!counting ? (
            <View style={styles.row}>
              <AppIcon name="time" size={14} color={colors.text.secondary} />
              <AppText role="label" tone="secondary" tabular>
                {startLabel(room.scheduledAt)}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* 내 준비 상태 (GPS/Network) */}
        <View style={[styles.mine, { backgroundColor: colors.bg.surface }]}>
          <GpsStatus quality={gps} />
          <View style={styles.row}>
            <AppIcon name={reconnecting ? 'offline' : 'check'} size={16} color={reconnecting ? colors.status.warning : colors.status.success} />
            <AppText role="label">{reconnecting ? '다시 연결 중' : '서버 연결됨'}</AppText>
          </View>
        </View>

        {/* 참가자 준비 상태 */}
        <View style={styles.members}>
          <View style={styles.membersHead}>
            <AppText role="sectionTitle" accessibilityRole="header">
              참가자
            </AppText>
            <AppText role="label" tone="secondary" tabular>
              {joined.length}/{room.members.length}명 참가 · {readyCount}명 준비
            </AppText>
          </View>
          {/* TGT-002 참가한 사람은 출발 전까지 친구를 더 부를 수 있다 */}
          {me.status !== 'INVITED' && !counting ? <SecondaryButton label="친구 초대" size="sm" onPress={onInvite} style={styles.selfStart} /> : null}
          {members.map((m) => (
            <View key={m.userId} style={[styles.member, m.isMe && { backgroundColor: colors.action.tint }]}>
              <View style={[styles.avatar, { backgroundColor: colors.bg.elevated }]}>
                <AppText role="label" style={styles.bold}>
                  {m.name.slice(0, 1)}
                </AppText>
              </View>
              {/* 113장 ParticipantChip: 상태를 먼저, 이름은 그 뒤 */}
              <ParticipantChip name={m.name} status={participantStatus(m.status)} style={styles.flex} />
              {m.isMe ? <Tag text="나" /> : null}
              {m.isHost ? <Tag text="방장" /> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + spacing.md, borderTopColor: colors.border.subtle }]}>
        <MyAction room={room} me={me} gps={gps} busy={busy} counting={counting} onReady={onReady} onJoin={onJoin} />
      </View>
    </>
  );
}

// 모두 준비되면 서버가 정한 출발 시각까지 센다. 각 숫자 약한 햅틱, 출발 강한 햅틱 (69장 Run Start)
function Countdown({ room }: { room: LiveRoom }) {
  const now = useNow(200);
  const left = Math.max(0, Math.ceil(((room.startsAt ?? 0) - now) / 1000));
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (last.current === left) return;
    last.current = left;
    if (left > 0) haptics.countdownTick();
    else {
      haptics.runStart();
      router.replace({ pathname: '/together/[roomId]/live', params: { roomId: room.id } });
    }
  }, [left, room.id]);

  return (
    <View accessible accessibilityLiveRegion="assertive" accessibilityLabel={`모두 준비됐어요. ${left}초 뒤 출발`}>
      <AppText role="caption" tone="accent" style={styles.bold}>
        모두 준비됐어요 · {goalLabel(room)}
      </AppText>
      <AppText role="metricGiant" tone="accent" tabular>
        {left}
      </AppText>
    </View>
  );
}

function MyAction({
  room,
  me,
  gps,
  busy,
  counting,
  onReady,
  onJoin,
}: {
  room: LiveRoom;
  me: LiveMember;
  gps: GpsQuality;
  busy: boolean;
  counting: boolean;
  onReady: (v: boolean) => void;
  onJoin: () => void;
}) {
  const now = useNow();
  const gpsOk = gps === 'good' || gps === 'fair';
  if (me.status === 'INVITED') return <PrimaryRunButton label="참가하기" loading={busy} onPress={onJoin} />;
  if (me.status === 'READY') {
    const waitingFor = room.scheduledAt != null && now < room.scheduledAt ? `${startLabel(room.scheduledAt, now).split(' · ')[0]}에 출발해요` : '다른 참가자가 준비하면 출발해요';
    return (
      <View style={styles.readyRow}>
        <AppText role="label" tone="accent" style={[styles.bold, styles.flex]}>
          {counting ? '곧 출발해요' : waitingFor}
        </AppText>
        <SecondaryButton label="준비 취소" size="sm" disabled={busy} onPress={() => onReady(false)} />
      </View>
    );
  }
  return (
    <PrimaryRunButton
      label="준비 완료"
      loading={busy}
      availability={gpsOk ? 'ready' : 'disabledGPS'}
      reason={gps === 'acquiring' ? 'GPS를 찾으면 준비할 수 있어요' : undefined}
      onPress={() => onReady(true)}
    />
  );
}

function Tag({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { borderColor: colors.border.strong }]}>
      <AppText role="caption" tone="secondary">
        {text}
      </AppText>
    </View>
  );
}

function LeaveSheet({
  invited,
  host,
  busy,
  onStay,
  onLeave,
  bottomInset,
}: {
  invited: boolean;
  host: boolean;
  busy: boolean;
  onStay: () => void;
  onLeave: () => void;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.scrim}>
      <AppPressable onPress={onStay} feedback="none" accessibilityLabel="닫기" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: bottomInset + spacing.lg, boxShadow: elevation.sheet }]}>
        <AppText role="screenTitle" accessibilityRole="header">
          {invited ? '초대를 거절할까요?' : host ? '방을 취소할까요?' : '방에서 나갈까요?'}
        </AppText>
        <AppText role="body" tone="secondary">
          {invited ? '함께 달리기 목록에서 이 방이 빠져요.' : host ? '초대한 친구들에게도 방이 취소돼요.' : '다시 들어오려면 초대를 다시 받아야 해요.'}
        </AppText>
        <View style={styles.sheetActions}>
          <SecondaryButton label="계속 기다리기" onPress={onStay} style={styles.flex} />
          <SecondaryButton label={invited ? '거절' : host ? '방 취소' : '나가기'} emphasized disabled={busy} onPress={onLeave} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

// 내 GPS 준비 상태. 실제로는 Run Ready와 같은 LocationSource를 쓴다.
function useMyGps(): GpsQuality {
  const source = useMemo(() => createMockLocationSource('granted'), []);
  const [q, setQ] = useState<GpsQuality>('acquiring');
  useEffect(() => {
    let alive = true;
    const read = () => source.getCurrentQuality().then((v) => alive && setQ(v));
    read();
    const t = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [source]);
  return q;
}

// 초대 링크를 보낸다. 서버가 있으면 메신저에서 눌리는 공유 페이지 주소(/s/{code}), 받은 사람이 누르면 이 방 대기실이 열린다
async function shareInvite(room: LiveRoom) {
  try {
    const link = await getShareRepository().create('LIVE_ROOM', room.id, room.course?.id ?? null);
    await Share.share({ message: `달리모에서 ${goalLabel(room)} 같이 달려요\n${startLabel(room.scheduledAt)}\n${link.url}` });
  } catch {
    // 사용자가 취소했거나 공유를 지원하지 않는 환경
  }
}

const styles = StyleSheet.create({
  selfStart: {
    alignSelf: 'flex-start',
  },
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.control,
    padding: spacing.md,
  },
  members: {
    gap: spacing.xs,
  },
  membersHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  member: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs + 2,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readyRow: {
    minHeight: touchTarget.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
