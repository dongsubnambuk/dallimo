import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives';
import { spacing } from '@/design/tokens';

// 개발 빌드에서만 보이는 상태 확인 링크. 마이 탭 맨 아래에 둔다. 제품 화면이 아니다.
export function DevLinks() {
  if (!__DEV__) return null;
  return (
    <View style={styles.root}>
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
      {(
        [
          ['레이스', 'LIVE_RACE', 'normal'],
          ['타임 어택', 'TIME_ATTACK', 'normal'],
          ['함께', 'TOGETHER', 'normal'],
          ['레이스 · 친구 연결 끊김', 'LIVE_RACE', 'memberDisconnected'],
          ['레이스 · 친구 중도 포기', 'LIVE_RACE', 'dnf'],
          ['레이스 · 내 연결 끊김', 'LIVE_RACE', 'offline'],
        ] as const
      ).map(([name, mode, scenario]) => (
        <Link key={`live-${name}`} href={{ pathname: '/together/[roomId]/live', params: { roomId: 'demo', mode, scenario, speed: '20' } }}>
          <AppText role="label" tone="accent">
            함께 달리는 중 · {name} (20배속)
          </AppText>
        </Link>
      ))}
      {(['normal', 'loading', 'empty', 'error', 'localOnly'] as const).map((s) => (
        <Link key={`my-${s}`} href={{ pathname: '/my', params: { scenario: s } }}>
          <AppText role="label" tone="accent">
            마이 · {s}
          </AppText>
        </Link>
      ))}
      {(['normal', 'loading', 'empty', 'error', 'localOnly'] as const).map((s) => (
        <Link key={`history-${s}`} href={{ pathname: '/my/runs', params: { scenario: s } }}>
          <AppText role="label" tone="accent">
            러닝 기록 · {s}
          </AppText>
        </Link>
      ))}
      <Link href={{ pathname: '/my/runs/[id]', params: { id: 'run-missing' } }}>
        <AppText role="label" tone="accent">
          러닝 상세 · 없는 기록
        </AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
});
