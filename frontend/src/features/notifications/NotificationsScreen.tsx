import { router, type Href } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { AppNotification, NotificationType } from '@/entities/notification/types';
import { agoLabel } from '@/features/friends/labels';

import { useMarkRead, useNotificationList, useUnreadCount } from './useNotifications';

const ICON: Record<NotificationType, IconName> = {
  FRIEND_REQUEST: 'tabTogether',
  LIVE_INVITE: 'invited',
  LIVE_CANCELED: 'rejected',
  RECORD_BEATEN: 'rankDown',
  CHALLENGE_DEFENDED: 'trophy',
};

// 알림함 (NTF, 14.2장). 사용자 결정: Push는 친구 요청 · 함께 달리기 초대 · 예약 방 취소 · 친구가 내 기록을 넘음 네 가지,
// 막아낸 도전은 여기에만. Push를 꺼도 여기에는 남는다. 누르면 읽음으로 바꾸고 그 화면으로 간다.
export function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const list = useNotificationList();
  const unread = useUnreadCount();
  const mark = useMarkRead();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));
  const open = (n: AppNotification) => {
    if (!n.read) mark.mutate(n.id);
    if (n.link?.startsWith('/')) router.push(n.link as Href);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header" style={styles.flex}>
          알림
        </AppText>
        {unread.data ? <SecondaryButton label="모두 읽음" size="sm" onPress={() => mark.mutate('all')} /> : null}
      </View>

      {list.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="알림 불러오는 중" />
        </View>
      ) : list.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title="알림을 불러오지 못했어요"
            body="연결을 확인하고 다시 시도해 주세요."
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => list.refetch()} />}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
          renderItem={({ item: n }) => (
            <AppPressable
              onPress={() => open(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? '' : '안 읽음, '}${n.title}, ${n.body}, ${agoLabel(n.createdAt)}`}
              style={[styles.row, !n.read && { backgroundColor: colors.action.tint }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.bg.surface }]}>
                <AppIcon name={ICON[n.type]} size={20} color={colors.text.primary} />
              </View>
              <View style={styles.flex}>
                <AppText role="body" style={styles.bold} numberOfLines={1}>
                  {n.title}
                </AppText>
                <AppText role="label" tone="secondary" numberOfLines={2}>
                  {n.body}
                </AppText>
                <AppText role="caption" tone="secondary">
                  {agoLabel(n.createdAt)}
                </AppText>
              </View>
              {!n.read ? <View style={[styles.dot, { backgroundColor: colors.action.primary }]} /> : null}
            </AppPressable>
          )}
          ListEmptyComponent={
            <AppText role="body" tone="secondary" style={styles.empty}>
              아직 알림이 없어요. 친구 요청, 함께 달리기 초대, 내 코스 기록을 넘은 친구 소식이 여기에 와요.
            </AppText>
          }
        />
      )}
    </View>
  );
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
    gap: spacing.md,
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
  list: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    minHeight: touchTarget.min + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    padding: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
