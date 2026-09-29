import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { elevation, fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { LiveRoomRepository } from '@/entities/live/api/liveRoomRepository';
import type { LiveRoom } from '@/entities/live/types';

type Props = {
  room: LiveRoom;
  repo: LiveRoomRepository;
  onInvited: (room: LiveRoom) => void;
  onClose: () => void;
  bottomInset: number;
};

// TGT-002 대기실에서 친구 더 부르기. 이미 방에 있는 친구는 빼고 보여준다. 초대받은 친구는 함께 달리기 목록에서 방을 보고 참가한다
export function InviteFriendsSheet({ room, repo, onInvited, onClose, bottomInset }: Props) {
  const { colors } = useTheme();
  const friends = useQuery({ queryKey: ['live', 'friends'], queryFn: () => repo.listFriends(), retry: false });
  const [picked, setPicked] = useState<string[]>([]);
  const invite = useMutation({ mutationFn: () => repo.invite(room.id, picked), onSuccess: (r) => (onInvited(r), onClose()) });
  const inRoom = new Set(room.members.map((m) => m.userId));
  const candidates = (friends.data ?? []).filter((f) => !inRoom.has(f.userId));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View style={styles.scrim}>
      <AppPressable onPress={onClose} feedback="none" accessibilityLabel="닫기" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.canvas + 'B3' }]} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.bg.elevated, paddingBottom: bottomInset + spacing.lg, boxShadow: elevation.sheet }]}>
        <AppText role="screenTitle" accessibilityRole="header">
          친구 초대
        </AppText>
        {friends.isPending ? (
          <View style={styles.loader}>
            <BrandLoader size={32} label="친구 불러오는 중" />
          </View>
        ) : friends.isError ? (
          <SecondaryButton label="친구 목록 다시 불러오기" size="sm" onPress={() => friends.refetch()} style={styles.selfStart} />
        ) : candidates.length === 0 ? (
          <View style={styles.empty}>
            <AppText role="body" tone="secondary">
              {friends.data.length ? '친구가 모두 이 방에 있어요.' : '아직 친구가 없어요. 초대 링크로 부르거나 마이 › 친구에서 친구를 추가해 보세요.'}
            </AppText>
            {friends.data.length ? null : <SecondaryButton label="친구 찾기" size="sm" onPress={() => (onClose(), router.push('/my/friends'))} style={styles.selfStart} />}
          </View>
        ) : (
          <ScrollView style={styles.list}>
            {candidates.map((f) => {
              const on = picked.includes(f.userId);
              return (
                <AppPressable
                  key={f.userId}
                  onPress={() => toggle(f.userId)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={f.name}
                  style={styles.friend}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.bg.surface }]}>
                    <AppText role="label" style={styles.bold}>
                      {f.name.slice(0, 1)}
                    </AppText>
                  </View>
                  <AppText role="body" style={styles.flex} numberOfLines={1}>
                    {f.name}
                  </AppText>
                  <View style={[styles.check, on ? { backgroundColor: colors.action.secondary } : { borderColor: colors.border.strong, borderWidth: 1.5 }]}>
                    {on ? <AppIcon name="check" size={16} color={colors.action.onSecondary} /> : null}
                  </View>
                </AppPressable>
              );
            })}
          </ScrollView>
        )}
        {invite.isError ? (
          <AppText role="label" tone="secondary" accessibilityLiveRegion="polite">
            초대하지 못했어요. 방이 가득 찼거나 이미 시작했을 수 있어요.
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <SecondaryButton label="닫기" onPress={onClose} style={styles.flex} />
          <SecondaryButton
            label={picked.length ? `${picked.length}명 초대하기` : '초대할 친구를 골라 주세요'}
            emphasized
            disabled={picked.length === 0 || invite.isPending}
            onPress={() => invite.mutate()}
            style={styles.grow}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  loader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    gap: spacing.md,
  },
  friend: {
    minHeight: touchTarget.min + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  grow: {
    flex: 1.6,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
