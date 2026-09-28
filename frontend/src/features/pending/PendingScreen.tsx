import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

// 아직 구현 순서(72장)가 오지 않은 탭의 자리. 제품 화면이 아니다.
export function PendingScreen({
  title,
  order,
  showDevLinks,
  handoff,
  action,
}: {
  title: string;
  order: string;
  showDevLinks?: boolean;
  handoff?: string | null;
  // 흐름 확인용으로 앞 화면에 돌아가는 버튼
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.brand}>
        <Wordmark height={24} />
      </View>
      <AppText role="screenTitle" accessibilityRole="header">
        {title}
      </AppText>
      <AppText role="body" tone="secondary">
        {order}에서 구현합니다.
      </AppText>
      {handoff ? (
        // 앞 화면에서 넘겨받은 선택 (흐름 확인용)
        <View style={[styles.handoff, { backgroundColor: colors.bg.surface }]}>
          <AppText role="caption" tone="secondary">
            넘겨받은 선택
          </AppText>
          <AppText role="label">{handoff}</AppText>
        </View>
      ) : null}
      {action ? <SecondaryButton label={action.label} emphasized onPress={action.onPress} style={styles.action} /> : null}
      {showDevLinks && __DEV__ ? (
        <View style={styles.dev}>
          <AppText role="caption" tone="secondary">
            개발용
          </AppText>
          <Link href="/design-system">
            <AppText role="label" tone="accent">
              Design System Playground
            </AppText>
          </Link>
          {(['loading', 'denied', 'empty', 'error'] as const).map((s) => (
            <Link key={s} href={{ pathname: '/', params: { scenario: s } }}>
              <AppText role="label" tone="accent">
                탐색 화면 · {s}
              </AppText>
            </Link>
          ))}
          {(['normal', 'denied', 'acquiring', 'poor', 'far'] as const).map((s) => (
            <Link key={`run-${s}`} href={{ pathname: '/run', params: { scenario: s, mode: 'PB', courseId: 'c-suseongmot', targetSec: '602', targetLabel: '내 PB −10초' } }}>
              <AppText role="label" tone="accent">
                달리기 준비 · {s}
              </AppText>
            </Link>
          ))}
          {(['normal', 'poorGps', 'offline', 'recovering', 'finishPending'] as const).map((s) => (
            <Link key={`active-${s}`} href={{ pathname: '/run/active', params: { scenario: s, speed: '20' } }}>
              <AppText role="label" tone="accent">
                러닝 중 · {s} (20배속)
              </AppText>
            </Link>
          ))}
          {(
            [
              ['완주', { mode: 'COURSE', courseId: 'c-suseongmot' }],
              ['PB 어택', { mode: 'PB', courseId: 'c-suseongmot', targetSec: '602', targetLabel: '내 PB −10초' }],
              ['PB 어택 · 뒤처짐', { mode: 'PB', courseId: 'c-suseongmot', targetSec: '602', targetLabel: '내 PB −10초', scenario: 'behind' }],
              ['라이벌 · 이탈', { mode: 'CHALLENGE', courseId: 'c-deuran', targetSec: '700', targetLabel: '지수', scenario: 'offRoute' }],
            ] as const
          ).map(([name, q]) => (
            <Link key={`course-${name}`} href={{ pathname: '/run/active', params: { ...q, speed: '20' } }}>
              <AppText role="label" tone="accent">
                코스 러닝 · {name} (20배속)
              </AppText>
            </Link>
          ))}
          {(
            [
              ['PB 갱신', 'pb', 'normal'],
              ['PB 못 넘음', 'noPb', 'normal'],
              ['미인증', 'pb', 'unverified'],
              ['거부', 'pb', 'rejected'],
              ['휴대폰에만 저장', 'pb', 'localOnly'],
              ['올리는 중', 'pb', 'syncing'],
              ['완주 못 함', 'dnf', 'normal'],
              ['자유 달리기', 'free', 'normal'],
            ] as const
          ).map(([name, demo, scenario]) => (
            <Link key={`result-${name}`} href={{ pathname: '/run/result', params: { demo, scenario } }}>
              <AppText role="label" tone="accent">
                러닝 결과 · {name}
              </AppText>
            </Link>
          ))}
          {(['normal', 'loading', 'empty', 'unranked', 'error'] as const).map((s) => (
            <Link key={`ranking-${s}`} href={{ pathname: '/course/[id]/ranking', params: { id: 'c-suseongmot', scenario: s } }}>
              <AppText role="label" tone="accent">
                코스 랭킹 · {s}
              </AppText>
            </Link>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    marginBottom: spacing.xl,
  },
  handoff: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  action: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },
  dev: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
});
