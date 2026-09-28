import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { PrimaryRunButton } from '@/components/PrimaryRunButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { createMockLiveRoomRepository } from '@/entities/live/api/mockLiveRoomRepository';
import type { LiveResult, LiveResultEntry } from '@/entities/live/types';
import { formatDistanceKm, formatDuration, formatDurationSpoken } from '@/shared/format';

import { goalLabel, MODE_INFO } from './labels';

// SCR-T05 Live 결과 (TGT-011~012): 순위, 기록, 차이, DNF, 공유/재대결.
// 89장 Result는 light로 복귀. 결과는 서버 finalization 값을 쓴다 (46.1장). TOGETHER는 승패를 강조하지 않는다 (62.1장).
export function LiveResultScreen({ roomId }: { roomId: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repo = useMemo(() => createMockLiveRoomRepository('normal'), []);
  const result = useQuery({ queryKey: ['live', 'result', roomId], queryFn: () => repo.getResult(roomId), retry: 3, retryDelay: 1000 });
  const rematch = useMutation({
    mutationFn: () => repo.rematch(roomId),
    onSuccess: (room) => router.replace({ pathname: '/together/[roomId]', params: { roomId: room.id } }),
  });
  const close = () => router.dismissTo('/together');

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppPressable onPress={close} accessibilityLabel="결과 닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="close" size={20} color={colors.text.primary} />
        </AppPressable>
      </View>
      {result.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="결과 정리하는 중" />
        </View>
      ) : !result.data ? (
        <View style={styles.pad}>
          <StateNotice
            icon="pending"
            title="결과를 정리하고 있어요"
            body="모든 참가자의 기록이 모이면 결과가 나와요."
            actions={<SecondaryButton label="다시 확인" size="sm" onPress={() => result.refetch()} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <Headline result={result.data} />
          <Standings result={result.data} />
          <View style={styles.actions}>
            <SecondaryButton label="공유" onPress={() => shareResult(result.data!)} style={styles.share} />
            <PrimaryRunButton label="같은 멤버로 다시" loading={rematch.isPending} onPress={() => rematch.mutate()} style={styles.flex} />
          </View>
          {result.data.myRunId ? (
            <SecondaryButton
              label="내 러닝 기록 자세히"
              size="sm"
              onPress={() => router.push({ pathname: '/run/result', params: { id: result.data!.myRunId! } })}
              style={styles.selfStart}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Headline({ result: r }: { result: LiveResult }) {
  const { colors } = useTheme();
  const me = r.entries.find((e) => e.isMe);
  const first = r.entries[0];
  const finished = r.entries.filter((e) => e.status === 'FINISHED').length;
  let title: string;
  let detail: string;
  if (!me || me.status === 'DNF') {
    title = '중도 포기했어요';
    detail = `${finished}명이 끝까지 달렸어요`;
  } else if (r.mode === 'TOGETHER') {
    title = '함께 완주했어요';
    detail = `${r.entries.length}명이 같은 시간에 달렸어요`;
  } else if (me.rank === 1) {
    title = '1위로 들어왔어요';
    detail = second(r) ?? '혼자 끝까지 달렸어요';
  } else {
    title = `${me.rank}위로 들어왔어요`;
    detail = behind(r, me, first) ?? '';
  }
  const good = me?.rank === 1 || (r.mode === 'TOGETHER' && me?.status === 'FINISHED');

  return (
    <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={`${goalLabel(r)}. ${title}. ${detail}`}>
      <AppText role="label" tone="secondary">
        {goalLabel(r)} · {MODE_INFO[r.mode].caption}
      </AppText>
      <View style={styles.headlineRow}>
        <View style={[styles.mark, { backgroundColor: good ? colors.action.primary : colors.bg.surface }]}>
          <AppIcon name={me?.status === 'DNF' ? 'dnf' : r.mode === 'TOGETHER' ? 'modeTogether' : 'trophy'} size={22} color={good ? colors.action.onPrimary : colors.text.primary} />
        </View>
        <AppText role="screenTitle" style={styles.flexShrink}>
          {title}
        </AppText>
      </View>
      <AppText role="body" tone="secondary">
        {detail}
      </AppText>
      {me && me.status === 'FINISHED' ? (
        <AppText role="metricHero" tabular>
          {r.mode === 'TIME_ATTACK' ? `${formatDistanceKm(me.distanceM)}km` : formatDuration(me.timeSec)}
        </AppText>
      ) : null}
    </View>
  );
}

// 순위 · 기록 · 나와의 차이. 중도 포기(DNF)는 순위 없이 맨 뒤
function Standings({ result: r }: { result: LiveResult }) {
  const { colors } = useTheme();
  const me = r.entries.find((e) => e.isMe);
  return (
    <View style={[styles.card, { backgroundColor: colors.bg.surface }]}>
      {r.entries.map((e) => (
        <View key={e.userId} style={[styles.rowItem, e.isMe && { backgroundColor: colors.action.tint }]} accessible accessibilityLabel={rowLabel(r, e)}>
          <View style={[styles.badge, e.rank != null && e.rank <= 3 && r.mode !== 'TOGETHER' && { backgroundColor: colors.action.secondary }]}>
            <AppText role="label" tabular style={[styles.bold, e.rank != null && e.rank <= 3 && r.mode !== 'TOGETHER' && { color: colors.action.onSecondary }]}>
              {e.rank ?? (e.status === 'DNF' ? '—' : '·')}
            </AppText>
          </View>
          <AppText role="body" numberOfLines={1} style={[styles.bold, styles.flex]}>
            {e.name}
            {e.isMe ? ' (나)' : ''}
          </AppText>
          <View style={styles.value}>
            <AppText role="label" tabular style={styles.bold}>
              {e.status === 'DNF' ? '중도 포기' : r.mode === 'TIME_ATTACK' ? `${formatDistanceKm(e.distanceM)}km` : formatDuration(e.timeSec)}
            </AppText>
            {me && !e.isMe && e.status === 'FINISHED' && me.status === 'FINISHED' && r.mode !== 'TOGETHER' ? (
              <AppText role="caption" tone="secondary" tabular>
                {diffCopy(r, e, me)}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function diffCopy(r: LiveResult, e: LiveResultEntry, me: LiveResultEntry) {
  if (r.mode === 'TIME_ATTACK') {
    const d = Math.round(e.distanceM - me.distanceM);
    return d === 0 ? '같음' : `나보다 ${Math.abs(d)}m ${d > 0 ? '더' : '덜'}`;
  }
  const d = (e.timeSec ?? 0) - (me.timeSec ?? 0);
  return d === 0 ? '같음' : `나보다 ${formatDurationSpoken(d)} ${d < 0 ? '빠름' : '느림'}`;
}

function second(r: LiveResult) {
  const me = r.entries.find((e) => e.isMe);
  const s = r.entries.find((e) => e.rank === 2);
  if (!me || !s) return null;
  return r.mode === 'TIME_ATTACK' ? `2위 ${s.name}님보다 ${Math.round(me.distanceM - s.distanceM)}m 더 달렸어요` : `2위 ${s.name}님보다 ${formatDurationSpoken((s.timeSec ?? 0) - (me.timeSec ?? 0))} 빨랐어요`;
}

function behind(r: LiveResult, me: LiveResultEntry, first: LiveResultEntry) {
  return r.mode === 'TIME_ATTACK' ? `1위 ${first.name}님과 ${Math.round(first.distanceM - me.distanceM)}m 차이` : `1위 ${first.name}님과 ${formatDurationSpoken((me.timeSec ?? 0) - (first.timeSec ?? 0))} 차이`;
}

function rowLabel(r: LiveResult, e: LiveResultEntry) {
  return [e.rank != null ? `${e.rank}위` : null, e.name, e.isMe ? '나' : null, e.status === 'DNF' ? '중도 포기' : r.mode === 'TIME_ATTACK' ? `${formatDistanceKm(e.distanceM)}킬로미터` : formatDuration(e.timeSec)]
    .filter(Boolean)
    .join(', ');
}

async function shareResult(r: LiveResult) {
  const me = r.entries.find((e) => e.isMe);
  const line = me?.status === 'DNF' ? '중도 포기' : r.mode === 'TOGETHER' ? '함께 완주' : `${r.entries.length}명 중 ${me?.rank}위`;
  try {
    await Share.share({ message: `달리모 ${goalLabel(r)} · ${line}\n다음엔 같이 달려요` });
  } catch {
    // 사용자가 취소했거나 공유를 지원하지 않는 환경
  }
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
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  rowItem: {
    minHeight: touchTarget.min + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    alignItems: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  share: {
    minWidth: 96,
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
