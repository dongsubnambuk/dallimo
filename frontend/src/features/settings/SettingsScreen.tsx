import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { SOURCE_LABEL } from '@/entities/import/types';
import { getNotificationRepository } from '@/entities/notification/api';
import { runResultRepository } from '@/entities/run/api';
import { hasRunInProgress, signOut, withdraw } from '@/features/auth/session';
import { useMe } from '@/features/my/useMy';
import { API_BASE_URL } from '@/shared/api/config';
import { getPreferences, setPreference, usePreferences, type Preferences } from '@/shared/preferences';
import { useWatchState, type WatchState } from '@/shared/watch/watchTransport';

import { ConfirmSheet } from './components/ConfirmSheet';
import { SettingChoice, SettingRow, SettingSection } from './components/SettingRow';


type Sheet = 'logout' | 'withdraw' | 'running' | null;

// SCR-M07 설정 (MY-006): 자동 일시정지, 음성, Push, 개인정보, 로그아웃/탈퇴.
// 러닝 → 알림 → 개인정보 → 계정 순서. 자주 바꾸는 러닝 설정을 위에 둔다.
type PushKey = 'pushFriend' | 'pushLive' | 'pushRecord';

// 알림 종류 켜고 끄기는 서버에도 저장한다 (서버가 Push를 보내기 전에 본다). 화면을 열 때 서버 값을 기기에 맞춘다
function usePushSettings() {
  useEffect(() => {
    if (!API_BASE_URL) return;
    getNotificationRepository()
      .settings()
      .then((s) => {
        setPreference('pushFriend', s.friend);
        setPreference('pushLive', s.live);
        setPreference('pushRecord', s.record);
      })
      .catch(() => undefined);
  }, []);
  return (key: PushKey, value: boolean) => {
    setPreference(key, value);
    const p: Preferences = getPreferences();
    void getNotificationRepository()
      .saveSettings({ friend: p.pushFriend, live: p.pushLive, record: p.pushRecord })
      .catch(() => undefined);
  };
}

function watchFooter(w: WatchState): string {
  if (!w.paired) return '연결된 Apple Watch가 없어요. 휴대폰의 Watch 앱에서 먼저 연결해 주세요.';
  if (!w.installed) return 'Apple Watch에 달리모 앱이 없어요. 휴대폰의 Watch 앱 › 사용 가능한 앱에서 달리모를 설치해 주세요.';
  return 'Apple Watch와 연결됐어요.';
}

export function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePreferences();
  const push = usePushSettings();
  const me = useMe('normal');
  const watch = useWatchState();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 로그아웃 전에 아직 올리지 못한 기록이 있는지 알려준다
  const localOnly = useQuery({
    queryKey: ['run', 'localOnlyCount'],
    queryFn: async () => (await runResultRepository.list(null, 50)).items.filter((r) => r.sync === 'localOnly').length,
    enabled: sheet === 'logout',
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));
  const profile = me.data?.profile ?? null;

  const open = (s: 'logout' | 'withdraw') => {
    setError(null);
    // AUTH-004 진행 중 러닝 보호
    setSheet(hasRunInProgress() ? 'running' : s);
  };
  const run = async (fn: () => Promise<void>, failCopy: string) => {
    setBusy(true);
    setError(null);
    try {
      // 끝나면 로그인 상태가 바뀌고 루트 레이아웃이 로그인 화면으로 보낸다
      await fn();
    } catch {
      setError(failCopy);
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          설정
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {profile ? (
          <AppPressable
            onPress={() => router.push('/settings/profile')}
            accessibilityRole="button"
            accessibilityLabel={`${profile.nickname}, 프로필 수정`}
            style={[styles.profile, { backgroundColor: colors.bg.surface }]}
          >
            <Avatar nickname={profile.nickname} imageUrl={profile.profileImageUrl} />
            <View style={styles.flex}>
              <AppText role="sectionTitle" numberOfLines={1}>
                {profile.nickname}
              </AppText>
              <AppText role="caption" tone="secondary">
                프로필 사진 · 닉네임 바꾸기
              </AppText>
            </View>
            <AppIcon name="collapse" size={18} color={colors.text.secondary} />
          </AppPressable>
        ) : null}

        <SettingSection title="러닝">
          <SettingRow kind="toggle" label="자동 일시정지" caption="멈춰 서면 기록을 멈추고, 다시 달리면 이어서 기록해요. 함께 달리기에서는 쓰지 않아요" value={prefs.autoPause} onChange={(v) => setPreference('autoPause', v)} />
          <SettingRow kind="toggle" label="음성 안내" caption="구간 기록 · 코스 이탈 · 완주를 소리로 알려요" value={prefs.voice} onChange={(v) => setPreference('voice', v)} />
          {/* AUD-002 경쟁 안내 */}
          <SettingRow
            kind="toggle"
            label="경쟁 안내"
            caption="목표보다 앞서거나 뒤처질 때, 순위가 바뀔 때, 친구가 완주할 때 알려요"
            value={prefs.voiceCompetition}
            disabled={!prefs.voice}
            onChange={(v) => setPreference('voiceCompetition', v)}
          />
          {/* AUD-003 구간 안내 빈도 */}
          <SettingChoice
            label="구간 안내"
            caption="거리 · 시간 · 평균 페이스를 읽어 줘요"
            value={prefs.voiceSplitKm}
            options={[
              { value: 1, label: '1km마다' },
              { value: 2, label: '2km마다' },
              { value: 0, label: '끔' },
            ]}
            disabled={!prefs.voice}
            onChange={(v) => setPreference('voiceSplitKm', v)}
          />
          <SettingRow kind="toggle" label="진동" caption="출발 · 일시정지 · GPS 약함 · 완주를 진동으로 알려요" value={prefs.haptics} onChange={(v) => setPreference('haptics', v)} />
        </SettingSection>

        {/* WATCH-001: 달리기를 시작하면 워치에서도 보여 준다 (아이폰에서만) */}
        {watch.supported ? (
          <SettingSection title="Apple Watch" footer={watchFooter(watch)}>
            <SettingRow
              kind="toggle"
              label="워치에 러닝 보여주기"
              caption="시작하면 워치 앱이 켜져요. 거리 · 시간 · 페이스를 보고 워치에서 일시정지 · 끝내기를 할 수 있어요. 심박은 휴대폰에도 보여요"
              value={prefs.watchMirror}
              onChange={(v) => setPreference('watchMirror', v)}
            />
          </SettingSection>
        ) : null}

        {/* 122.3장 연동 설정 */}
        <SettingSection title="외부 기록">
          <SettingRow
            kind="link"
            label={SOURCE_LABEL.APPLE_HEALTH}
            caption="Apple Watch · 다른 앱으로 달린 기록 가져오기"
            value={prefs.healthImport ? '연결됨' : undefined}
            onPress={() => router.push('/import')}
          />
        </SettingSection>

        <SettingSection title="알림" footer="휴대폰 설정에서 달리모 알림을 끄면 여기 설정과 관계없이 알림이 오지 않아요.">
          <SettingRow kind="toggle" label="함께 달리기" caption="초대, 예약한 방 취소, 시작 10분 전" value={prefs.pushLive} onChange={(v) => push('pushLive', v)} />
          <SettingRow kind="toggle" label="친구 요청" value={prefs.pushFriend} onChange={(v) => push('pushFriend', v)} />
          <SettingRow kind="toggle" label="내 코스 기록" caption="친구가 내 코스 기록을 넘었을 때" value={prefs.pushRecord} onChange={(v) => push('pushRecord', v)} />
          <SettingRow
            kind="toggle"
            label="달리는 중 알림"
            caption="화면을 끈 채 달릴 때 GPS 약함, 코스 이탈, 완주, 오래 멈춤을 알려요"
            value={prefs.runAlerts}
            onChange={(v) => setPreference('runAlerts', v)}
          />
        </SettingSection>

        <SettingSection title="개인정보">
          <SettingRow kind="link" label="위치 권한" caption="러닝 기록과 주변 코스 찾기에 써요" value="휴대폰 설정" external onPress={() => Linking.openSettings().catch(() => undefined)} />
          <SettingRow kind="link" label="개인정보 처리방침" onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'privacy' } })} />
          <SettingRow kind="link" label="서비스 이용약관" onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'terms' } })} />
        </SettingSection>

        <SettingSection title="계정">
          {profile ? (
            <>
              <SettingRow kind="value" label="이메일" value={profile.email} />
              <SettingRow kind="link" label="비밀번호 바꾸기" caption="바꾸면 다른 기기에서는 로그아웃돼요" onPress={() => router.push('/settings/password')} />
              <SettingRow
                kind="value"
                label="친구 코드"
                caption="친구가 나를 찾을 때 써요"
                value={profile.friendCode}
                trailing={<SecondaryButton label="공유" size="sm" onPress={() => Share.share({ message: `달리모 친구 코드: ${profile.friendCode}` }).catch(() => undefined)} />}
              />
            </>
          ) : null}
          <SettingRow kind="link" label="로그아웃" onPress={() => open('logout')} />
          <SettingRow kind="link" label="탈퇴하기" tone="danger" onPress={() => open('withdraw')} />
        </SettingSection>

        <AppText role="caption" tone="secondary" style={styles.version}>
          달리모 {Constants.expoConfig?.version ?? ''}
        </AppText>
      </ScrollView>

      {sheet === 'running' ? (
        <ConfirmSheet title="달리는 중이에요" body="러닝을 끝내고 기록을 저장한 뒤에 로그아웃하거나 탈퇴할 수 있어요." onClose={() => setSheet(null)} />
      ) : sheet === 'logout' ? (
        <ConfirmSheet
          title="로그아웃할까요?"
          body={
            localOnly.data
              ? `아직 올리지 못한 기록이 ${localOnly.data}개 있어요. 인터넷에 연결해 올린 뒤에 로그아웃하는 걸 권해요.`
              : '다시 로그인하면 기록과 설정을 그대로 볼 수 있어요.'
          }
          confirmLabel="로그아웃"
          busy={busy}
          error={error}
          onConfirm={() => run(signOut, '로그아웃하지 못했어요. 다시 시도해 주세요.')}
          onClose={() => setSheet(null)}
        />
      ) : sheet === 'withdraw' ? (
        <ConfirmSheet
          title="탈퇴할까요?"
          body="계정과 러닝 기록, 코스 순위를 다시 볼 수 없어요. 개인정보는 개인정보 처리방침에 따라 처리돼요."
          confirmLabel="탈퇴하기"
          danger
          busy={busy}
          error={error}
          onConfirm={() => run(withdraw, '탈퇴하지 못했어요. 연결을 확인하고 다시 시도해 주세요.')}
          onClose={() => setSheet(null)}
        />
      ) : null}
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  version: {
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
});
