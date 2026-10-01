import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { AuthFrame } from '@/features/auth/AuthFrame';

import { OnboardingHeader } from './components/OnboardingHeader';
import { finishOnboarding } from './onboardingState';
import { openPhoneSettings, permissionState, requestPermission, type PermissionKind, type PermissionState } from './permissions';

// 가입 직후 2단계: 권한 안내 (사용자 결정, 결정 로그 64항).
// 휴대폰 권한 창을 바로 띄우지 않고 무엇에 쓰는지 먼저 보여 준다. 하나씩 고르고, 모두 나중에 해도 된다.
// 나중에 해도 지금처럼 필요한 순간(탐색 · 러닝 준비 · 친구 요청 · 함께 달리기)에 다시 묻는다.

type Item = { kind: PermissionKind; icon: IconName; title: string; body: string };

const ITEMS: Item[] = [
  { kind: 'location', icon: 'gpsGood', title: '위치', body: '달린 경로와 거리를 기록하고 내 주변 코스를 찾아요. 화면을 꺼도 기록이 이어져요.' },
  { kind: 'notification', icon: 'notification', title: '알림', body: '친구 요청, 함께 달리기 초대와 시작, 내 코스 기록이 깨졌을 때 알려 드려요.' },
  { kind: 'health', icon: 'health', title: 'Apple 건강', body: 'Apple Watch 같은 다른 기기로 달린 기록을 달리모로 가져올 수 있어요.' },
];

export function PermissionsScreen() {
  return (
    <AuthFrame>
      <Permissions />
    </AuthFrame>
  );
}

function Permissions() {
  const [states, setStates] = useState<Partial<Record<PermissionKind, PermissionState>>>({});
  const [asking, setAsking] = useState<PermissionKind | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all(ITEMS.map(async (i) => [i.kind, await permissionState(i.kind)] as const)).then((list) => {
      if (alive) setStates(Object.fromEntries(list));
    });
    return () => {
      alive = false;
    };
  }, []);

  const ask = async (kind: PermissionKind) => {
    setAsking(kind);
    const next = await requestPermission(kind);
    setStates((s) => ({ ...s, [kind]: next }));
    setAsking(null);
  };

  // 이 기기에서 못 쓰는 권한(웹의 알림, 아이폰이 아닌 기기의 Apple 건강)은 보여 주지 않는다
  const visible = ITEMS.filter((i) => states[i.kind] && states[i.kind] !== 'unavailable');
  const allGranted = visible.length > 0 && visible.every((i) => states[i.kind] === 'granted');

  return (
    <>
      <OnboardingHeader step={2} total={2} onSkip={finishOnboarding} skipLabel="나중에 할게요" />
      <View style={styles.intro}>
        <AppText role="screenTitle" accessibilityRole="header">
          달리기 전에 켜 둘 것
        </AppText>
        <AppText role="body" tone="secondary">
          필요한 것만 켜도 돼요. 나중에 휴대폰 설정에서 바꿀 수 있어요.
        </AppText>
      </View>

      <View style={styles.list}>
        {visible.map((i) => (
          <PermissionRow key={i.kind} item={i} state={states[i.kind]!} busy={asking === i.kind} disabled={asking != null} onAsk={() => ask(i.kind)} />
        ))}
      </View>

      <View style={styles.bottom}>
        <SecondaryButton label={allGranted ? '시작하기' : '이대로 시작하기'} emphasized disabled={asking != null} onPress={finishOnboarding} style={styles.cta} />
      </View>
    </>
  );
}

function PermissionRow({ item, state, busy, disabled, onAsk }: { item: Item; state: PermissionState; busy: boolean; disabled: boolean; onAsk: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.bg.surface }]}>
      <View style={styles.rowTop}>
        <AppIcon name={item.icon} size={22} color={colors.text.primary} />
        <AppText role="sectionTitle" style={styles.flex}>
          {item.title}
        </AppText>
        {state === 'granted' ? (
          // 허용됨: 체크 아이콘 + 글자 (색만으로 구분하지 않는다)
          <View style={styles.granted} accessible accessibilityLabel={`${item.title} 허용됨`}>
            <AppIcon name="check" size={16} color={colors.status.success} />
            <AppText role="label" style={[styles.bold, { color: colors.status.success }]}>
              허용됨
            </AppText>
          </View>
        ) : state === 'denied' ? (
          <SecondaryButton label="설정에서 켜기" size="sm" onPress={openPhoneSettings} />
        ) : (
          <SecondaryButton label={busy ? '묻는 중' : '허용'} size="sm" emphasized disabled={disabled} onPress={onAsk} />
        )}
      </View>
      <AppText role="body" tone="secondary">
        {item.body}
      </AppText>
      {state === 'denied' ? (
        <AppText role="caption" tone="secondary">
          거절해서 다시 물을 수 없어요. 휴대폰 설정에서 켤 수 있어요.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
  },
  granted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  flex: {
    flex: 1,
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: touchTarget.primary,
  },
});
