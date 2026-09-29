import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { getLiveRoomRepository } from '@/entities/live/api';
import type { LiveScenario } from '@/entities/live/api/mockLiveRoomRepository';
import type { LiveRoom, LiveRoomSummary } from '@/entities/live/types';

import { agoLabel, goalLabel, MODE_INFO, startLabel } from './labels';

// SCR-T01 Together 홈 (TGT-001): 예정된 방, 최근 결과, 새 방 만들기.
// 89장 Together Lobby: 방 목표와 참가자 준비 상태가 핵심, 채팅창 없음. 레퍼런스: Zwift 이벤트 목록, Runky — CLAUDE.md 4항 Together.
export function TogetherHomeScreen({ scenario }: { scenario: LiveScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => getLiveRoomRepository(scenario), [scenario]);
  const upcoming = useQuery({ queryKey: ['live', 'upcoming', scenario], queryFn: () => repo.listUpcoming(), retry: false });
  const recent = useQuery({ queryKey: ['live', 'recent', scenario], queryFn: () => repo.listRecent(), retry: false });
  const create = () => router.push('/together/new');

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg.canvas }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.huge }]}
    >
      <View style={styles.head}>
        <AppText role="screenTitle" accessibilityRole="header">
          함께 달리기
        </AppText>
        <AppText role="body" tone="secondary">
          장소가 달라도 같은 시간에 달려요. 서로의 위치 대신 거리와 진행률만 보여요.
        </AppText>
        <SecondaryButton label="방 만들기" emphasized onPress={create} style={styles.create} />
      </View>

      <View style={styles.section}>
        <AppText role="sectionTitle" accessibilityRole="header">
          예정된 방
        </AppText>
        {upcoming.isPending ? (
          <View style={styles.loader}>
            <BrandLoader size={40} label="예정된 방 불러오는 중" />
          </View>
        ) : upcoming.isError ? (
          <StateNotice
            icon="warning"
            tone="warning"
            title="방 목록을 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => upcoming.refetch()} />}
          />
        ) : upcoming.data.length === 0 ? (
          <AppText role="body" tone="secondary">
            예정된 방이 없어요. 친구와 같은 시간에 달려 보세요.
          </AppText>
        ) : (
          upcoming.data.map((r) => <RoomCard key={r.id} room={r} />)
        )}
      </View>

      {recent.data && recent.data.length > 0 ? (
        <View style={styles.section}>
          <AppText role="sectionTitle" accessibilityRole="header">
            최근 결과
          </AppText>
          <View style={[styles.recent, { backgroundColor: colors.bg.surface }]}>
            {recent.data.map((r) => (
              <RecentRow key={r.id} item={r} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function RoomCard({ room }: { room: LiveRoom }) {
  const { colors } = useTheme();
  const me = room.members.find((m) => m.isMe);
  const invitedMe = me?.status === 'INVITED';
  const host = room.members.find((m) => m.isHost);
  const joined = room.members.filter((m) => m.status !== 'INVITED').length;
  const ready = room.members.filter((m) => m.status === 'READY').length;
  const info = MODE_INFO[room.mode];
  const open = () => router.push({ pathname: '/together/[roomId]', params: { roomId: room.id } });

  return (
    <AppPressable
      onPress={open}
      accessibilityLabel={`${goalLabel(room)}, ${startLabel(room.scheduledAt)}, ${room.members.length}명 중 ${ready}명 준비${invitedMe ? `, ${host?.name}님이 초대` : ''}`}
      style={[styles.card, { backgroundColor: colors.bg.surface }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.badge}>
          <AppIcon name={info.icon} size={16} color={colors.text.primary} />
          <AppText role="label" tone="secondary">
            {info.caption}
          </AppText>
        </View>
        {invitedMe ? (
          <View style={[styles.invite, { backgroundColor: colors.action.primary }]}>
            <AppText role="caption" style={[styles.bold, { color: colors.action.onPrimary }]}>
              초대 받음
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText role="screenTitle">{goalLabel(room)}</AppText>
      {room.course ? (
        <AppText role="label" tone="secondary">
          코스 · {room.course.name}
        </AppText>
      ) : null}
      <View style={styles.cardBottom}>
        <View style={styles.row}>
          <AppIcon name="time" size={14} color={colors.text.secondary} />
          <AppText role="label" tone="secondary" tabular>
            {startLabel(room.scheduledAt)}
          </AppText>
        </View>
        <AppText role="label" tone="secondary" tabular>
          {invitedMe ? `${host?.name}님이 초대 · ${joined}명 참가` : `${room.members.length}명 중 ${ready}명 준비`}
        </AppText>
      </View>
    </AppPressable>
  );
}

function RecentRow({ item }: { item: LiveRoomSummary }) {
  const outcome = item.mode === 'TOGETHER' ? (item.myFinished ? '함께 완주' : '중도 포기') : item.myRank != null ? `${item.memberCount}명 중 ${item.myRank}위` : '중도 포기';
  return (
    <View style={styles.recentRow} accessible accessibilityLabel={`${goalLabel(item)}, ${outcome}, ${agoLabel(item.finishedAt)}`}>
      <View style={styles.flex}>
        <AppText role="label" style={styles.bold}>
          {goalLabel(item)}
        </AppText>
        <AppText role="caption" tone="secondary">
          {agoLabel(item.finishedAt)}
        </AppText>
      </View>
      <AppText role="label" tone={item.myRank === 1 ? 'accent' : 'primary'} style={styles.bold}>
        {outcome}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xxl,
  },
  head: {
    gap: spacing.sm,
  },
  create: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  invite: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  cardBottom: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recent: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
