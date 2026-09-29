import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import type { FriendScenario } from '@/entities/friend/api/mockFriendRepository';
import { FriendError } from '@/entities/friend/api/friendRepository';
import type { FriendProfile } from '@/entities/friend/types';
import { formatDuration } from '@/shared/format';

import { RelationButtons } from './FriendsScreen';
import { agoLabel } from './labels';
import { useFriendAction, useFriendProfile } from './useFriends';

// SCR-M05 친구 프로필 (FND-005). 사용자 결정: 닉네임, 인증된 코스 기록, 마지막으로 달린 날.
// 자유 달리기 경로 · 위치는 보여주지 않는다. 기록은 친구에게만 보이고, 코스를 누르면 그 코스로 가서 같이 겨룬다.
export function FriendProfileScreen({ userId, scenario }: { userId: string; scenario: FriendScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useFriendProfile(scenario, userId);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my/friends'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
      </View>
      {profile.isPending ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="프로필 불러오는 중" />
        </View>
      ) : profile.isError ? (
        <View style={styles.pad}>
          <StateNotice
            icon="warning"
            tone="warning"
            title={profile.error instanceof FriendError && profile.error.kind === 'notFound' ? '러너를 찾을 수 없어요' : '프로필을 불러오지 못했어요'}
            body={profile.error instanceof FriendError && profile.error.kind === 'notFound' ? '탈퇴했거나 없는 러너예요.' : '연결을 확인하고 다시 시도해 주세요.'}
            actions={<SecondaryButton label="다시 시도" size="sm" onPress={() => profile.refetch()} />}
          />
        </View>
      ) : (
        <Body profile={profile.data} scenario={scenario} bottom={insets.bottom} />
      )}
    </View>
  );
}

function Body({ profile, scenario, bottom }: { profile: FriendProfile; scenario: FriendScenario; bottom: number }) {
  const { colors } = useTheme();
  const action = useFriendAction(scenario);
  const [confirm, setConfirm] = useState(false);
  const { user } = profile;
  const friend = user.relation === 'friend';

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + spacing.xxl }]}>
      <View style={styles.head}>
        <Avatar nickname={user.nickname} imageUrl={user.profileImageUrl} size={72} />
        <View style={styles.flex}>
          <AppText role="screenTitle" accessibilityRole="header" numberOfLines={1}>
            {user.nickname}
          </AppText>
          <AppText role="label" tone="secondary">
            {friend ? (profile.lastRunAt ? `마지막 달리기 ${agoLabel(profile.lastRunAt)}` : '아직 달린 기록이 없어요') : RELATION_LINE[user.relation]}
          </AppText>
        </View>
      </View>

      {friend ? null : (
        <View style={styles.actions}>
          <RelationButtons user={user} busy={action.isPending} onAction={(a) => action.mutate(a)} />
        </View>
      )}

      {friend ? (
        <View style={styles.section}>
          <AppText role="sectionTitle" accessibilityRole="header">
            코스 기록
          </AppText>
          {profile.records.length === 0 ? (
            <AppText role="body" tone="secondary">
              아직 인증된 코스 기록이 없어요.
            </AppText>
          ) : (
            profile.records.map((r) => (
              <AppPressable
                key={r.courseId}
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: r.courseId } })}
                accessibilityRole="button"
                accessibilityLabel={`${r.courseName}, 최고 기록 ${formatDuration(r.bestSec)}, ${agoLabel(r.recordedAt)}`}
                accessibilityHint="코스 상세를 열어요"
                style={[styles.record, { backgroundColor: colors.bg.surface }]}
              >
                <AppIcon name="modeCourse" size={20} color={colors.text.primary} />
                <View style={styles.flex}>
                  <AppText role="body" numberOfLines={1} style={styles.bold}>
                    {r.courseName}
                  </AppText>
                  <AppText role="caption" tone="secondary">
                    {agoLabel(r.recordedAt)}
                  </AppText>
                </View>
                <AppText role="sectionTitle" tabular>
                  {formatDuration(r.bestSec)}
                </AppText>
                <AppIcon name="collapse" size={18} color={colors.text.secondary} />
              </AppPressable>
            ))
          )}
        </View>
      ) : (
        <AppText role="body" tone="secondary">
          친구가 되면 코스 기록과 마지막으로 달린 날을 볼 수 있어요.
        </AppText>
      )}

      {friend ? (
        confirm ? (
          <View style={[styles.confirm, { backgroundColor: colors.bg.surface }]}>
            <AppText role="body" style={styles.bold}>
              {user.nickname}님과 친구를 끊을까요?
            </AppText>
            <AppText role="label" tone="secondary">
              친구 랭킹과 함께 달리기 친구 목록에서 빠져요. 상대에게 알리지 않아요.
            </AppText>
            <View style={styles.row}>
              <SecondaryButton label="그대로 두기" size="sm" onPress={() => setConfirm(false)} />
              <SecondaryButton
                label="친구 끊기"
                emphasized
                size="sm"
                disabled={action.isPending}
                onPress={() => action.mutate({ kind: 'remove', userId: user.userId }, { onSuccess: () => setConfirm(false) })}
              />
            </View>
          </View>
        ) : (
          <SecondaryButton label="친구 끊기" size="sm" onPress={() => setConfirm(true)} style={styles.selfStart} />
        )
      ) : null}
      {action.isError ? (
        <AppText role="label" tone="secondary" accessibilityLiveRegion="polite">
          처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const RELATION_LINE: Record<FriendProfile['user']['relation'], string> = {
  none: '아직 친구가 아니에요',
  friend: '친구',
  sent: '친구 요청을 보냈어요',
  received: '나에게 친구 요청을 보냈어요',
};

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
    paddingTop: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  record: {
    minHeight: touchTarget.min + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  confirm: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
