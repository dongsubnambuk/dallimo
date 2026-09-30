import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppSurface, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget, typography } from '@/design/tokens';
import type { FriendScenario } from '@/entities/friend/api/mockFriendRepository';
import type { UserSummary } from '@/entities/friend/types';
import { useMe } from '@/features/my/useMy';

import { FriendRow } from './components/FriendRow';
import { agoLabel } from './labels';
import { useFriendAction, useFriendList, useFriendRequests, useUserSearch, type FriendAction } from './useFriends';

// SCR-M05 친구 (FND-001~005): 검색(닉네임 · 친구 코드) → 요청 → 받은 사람이 수락 · 거절 → 친구 목록 → 프로필.
// 첫 화면은 받은 요청을 맨 위에 둔다(처리할 일이 먼저). 내 친구 코드는 메신저로 보내 찾게 한다.
export function FriendsScreen({ scenario }: { scenario: FriendScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          친구
        </AppText>
      </View>
      <View style={styles.searchWrap}>
        <AppSurface level="surface" radius="pill" style={styles.search}>
          <AppIcon name="search" size={18} color={colors.text.secondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="닉네임 또는 친구 코드"
            placeholderTextColor={colors.text.secondary}
            accessibilityLabel="친구 찾기, 닉네임 또는 친구 코드"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            maxLength={40}
            style={[styles.searchInput, { color: colors.text.primary }]}
          />
          {searching ? (
            <AppPressable onPress={() => setQuery('')} accessibilityLabel="검색어 지우기" style={styles.clear}>
              <AppIcon name="close" size={18} color={colors.text.secondary} />
            </AppPressable>
          ) : null}
        </AppSurface>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
        {searching ? <SearchResults scenario={scenario} query={query} /> : <Overview scenario={scenario} />}
      </ScrollView>
    </View>
  );
}

// ── 검색 결과 ──

function SearchResults({ scenario, query }: { scenario: FriendScenario; query: string }) {
  const result = useUserSearch(scenario, query);
  const action = useFriendAction(scenario);
  if (result.isPending) return <Loader label="찾는 중" />;
  if (result.isError) return <Failed onRetry={() => result.refetch()} />;
  if (result.data.items.length === 0) {
    return (
      <AppText role="body" tone="secondary" style={styles.note}>
        &lsquo;{query.trim()}&rsquo;에 맞는 러너가 없어요. 친구 코드(RUN-로 시작)를 받았다면 그대로 넣어 보세요.
      </AppText>
    );
  }
  return (
    <View>
      {result.data.items.map((u) => (
        <FriendRow
          key={u.userId}
          nickname={u.nickname}
          caption={RELATION_CAPTION[u.relation]}
          onPress={() => openProfile(u.userId)}
          trailing={<RelationButtons user={u} busy={action.isPending} onAction={(a) => action.mutate(a)} />}
        />
      ))}
    </View>
  );
}

const RELATION_CAPTION: Record<UserSummary['relation'], string | undefined> = {
  none: undefined,
  friend: '친구',
  sent: '요청 보냄',
  received: '나에게 친구 요청',
};

/** 관계에 맞는 버튼: 요청 · 요청 취소 · 수락 · 거절. 친구면 버튼 없음 */
export function RelationButtons({ user, busy, onAction }: { user: UserSummary; busy: boolean; onAction: (a: FriendAction) => void }) {
  if (user.relation === 'none') return <SecondaryButton label="친구 요청" emphasized size="sm" disabled={busy} onPress={() => onAction({ kind: 'request', userId: user.userId })} />;
  if (user.relation === 'sent') return <SecondaryButton label="요청 취소" size="sm" disabled={busy} onPress={() => onAction({ kind: 'remove', userId: user.userId })} />;
  if (user.relation === 'received' && user.requestId) {
    const requestId = user.requestId;
    return (
      <>
        <SecondaryButton label="거절" size="sm" disabled={busy} onPress={() => onAction({ kind: 'reject', requestId })} />
        <SecondaryButton label="수락" emphasized size="sm" disabled={busy} onPress={() => onAction({ kind: 'accept', requestId })} />
      </>
    );
  }
  return null;
}

// ── 첫 화면: 받은 요청 → 친구 → 보낸 요청 ──

function Overview({ scenario }: { scenario: FriendScenario }) {
  const { colors } = useTheme();
  const friends = useFriendList(scenario);
  const requests = useFriendRequests(scenario);
  const action = useFriendAction(scenario);
  const busy = action.isPending;

  if (friends.isPending || requests.isPending) return <Loader label="친구 불러오는 중" />;
  if (friends.isError || requests.isError) return <Failed onRetry={() => (friends.refetch(), requests.refetch())} />;
  const { received, sent } = requests.data;

  return (
    <>
      {received.length > 0 ? (
        <Section title={`받은 요청 ${received.length}`}>
          {received.map((r) => (
            <FriendRow
              key={r.requestId}
              nickname={r.nickname}
              caption={agoLabel(r.requestedAt)}
              onPress={() => openProfile(r.userId)}
              trailing={
                <RelationButtons
                  user={{ userId: r.userId, nickname: r.nickname, relation: 'received', requestId: r.requestId }}
                  busy={busy}
                  onAction={(a) => action.mutate(a)}
                />
              }
            />
          ))}
        </Section>
      ) : null}

      <Section title={friends.data.length ? `친구 ${friends.data.length}` : '친구'}>
        {friends.data.length === 0 ? (
          <AppText role="body" tone="secondary" style={styles.note}>
            아직 친구가 없어요. 닉네임으로 찾거나, 아래 내 친구 코드를 보내 보세요. 친구가 되면 코스 친구 랭킹과 함께 달리기 초대에 나와요.
          </AppText>
        ) : (
          friends.data.map((f) => <FriendRow key={f.userId} nickname={f.nickname} onPress={() => openProfile(f.userId)} />)
        )}
      </Section>

      {sent.length > 0 ? (
        <Section title={`보낸 요청 ${sent.length}`}>
          {sent.map((r) => (
            <FriendRow
              key={r.requestId}
              nickname={r.nickname}
              caption={`${agoLabel(r.requestedAt)} 요청`}
              onPress={() => openProfile(r.userId)}
              trailing={<SecondaryButton label="요청 취소" size="sm" disabled={busy} onPress={() => action.mutate({ kind: 'remove', userId: r.userId })} />}
            />
          ))}
        </Section>
      ) : null}

      <MyCode />
      {action.isError ? (
        <View style={[styles.error, { backgroundColor: colors.bg.surface }]} accessibilityLiveRegion="polite">
          <AppIcon name="warning" size={16} color={colors.status.warning} />
          <AppText role="label" style={styles.flex}>
            처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
          </AppText>
        </View>
      ) : null}
    </>
  );
}

// 내 친구 코드. 메신저로 보내면 받은 사람이 검색창에 넣어 찾는다
function MyCode() {
  const { colors } = useTheme();
  const me = useMe('normal');
  const code = me.data?.profile.friendCode;
  if (!code) return null;
  const send = () => Share.share({ message: `달리모에서 친구해요. 친구 코드: ${code}` }).catch(() => undefined);
  return (
    <View style={[styles.code, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.flex}>
        <AppText role="caption" tone="secondary">
          내 친구 코드
        </AppText>
        <AppText role="sectionTitle" tabular selectable style={styles.codeText}>
          {code}
        </AppText>
      </View>
      <SecondaryButton label="코드 보내기" size="sm" onPress={send} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText role="label" tone="secondary" accessibilityRole="header" style={styles.bold}>
        {title}
      </AppText>
      <View>{children}</View>
    </View>
  );
}

function Loader({ label }: { label: string }) {
  return (
    <View style={styles.loader}>
      <BrandLoader size={40} label={label} />
    </View>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <StateNotice
      icon="warning"
      tone="warning"
      title="친구 정보를 불러오지 못했어요"
      body="연결을 확인하고 다시 시도해 주세요."
      actions={<SecondaryButton label="다시 시도" size="sm" onPress={onRetry} />}
    />
  );
}

function openProfile(userId: string) {
  router.push({ pathname: '/my/friends/[userId]', params: { userId } });
}

const SEARCH_H = 44;

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
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  search: {
    height: SEARCH_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  searchInput: {
    flex: 1,
    height: SEARCH_H,
    fontFamily: fontFamily.medium,
    fontSize: typography.body.fontSize,
  },
  clear: {
    width: SEARCH_H,
    height: SEARCH_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    paddingTop: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  note: {
    paddingVertical: spacing.sm,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  codeText: {
    fontFamily: fontFamily.bold,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  loader: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
