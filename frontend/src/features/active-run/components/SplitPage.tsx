import { StyleSheet, View } from 'react-native';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, stroke, touchTarget } from '@/design/tokens';
import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import type { RunningEngine } from '@/features/run/engine/runningEngine';
import { formatPace } from '@/shared/format';

import { useElapsedSec } from '../useElapsedSec';

const ROW_HEIGHT = 44;
// 제목 줄 · 앞 구간 안내 한 줄 · 진행 중 구간 · 사이 간격이 차지하는 높이
const CHROME_HEIGHT = touchTarget.min + 20 + ROW_HEIGHT + spacing.md * 4;
// 지금 구간 페이스는 이만큼 달린 뒤부터 보여 준다 (그 전에는 값이 크게 흔들린다)
const MIN_PARTIAL_M = 100;

// 달리는 중 1km 구간 페이스 목록 (결정 로그 91항). 기록 화면을 아래로 넘기면 나온다.
// 92장: 달리는 동안 읽기 쉽게 큰 숫자 · 짧은 이름. 가장 빠른 구간은 민트 막대와 "가장 빠름" 글자로 같이 표시한다 (색만으로 구분하지 않는다).
// 들어갈 만큼만 최근 구간을 보여 주고, 앞 구간 수는 한 줄로 알린다 (전체는 결과 화면 구간 기록).
export function SplitPage({ engine, height, onBack }: { engine: RunningEngine; height: number; onBack: () => void }) {
  const { colors } = useTheme();
  const splits = useRunSnapshot(engine, (s) => s.splits);
  const avg = useRunSnapshot(engine, (s) => s.avgPaceSec);
  const fit = Math.max(3, Math.floor((height - CHROME_HEIGHT) / ROW_HEIGHT));
  const shown = splits.slice(-fit);
  const hidden = splits.length - shown.length;
  const fastest = splits.length > 1 ? Math.min(...splits.map((s) => s.sec)) : null;
  const slowest = Math.max(...splits.map((s) => s.sec), 0);

  return (
    <View style={[styles.root, { height }]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText role="sectionTitle" accessibilityRole="header">
            구간 페이스
          </AppText>
          <AppText role="caption" tone="secondary" tabular>
            평균 {formatPace(avg)}/km
          </AppText>
        </View>
        <AppPressable onPress={onBack} accessibilityRole="button" accessibilityLabel="기록 화면으로 돌아가기" style={[styles.back, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="expandUp" size={18} color={colors.text.primary} />
          <AppText role="label">기록</AppText>
        </AppPressable>
      </View>

      {hidden > 0 ? (
        <AppText role="caption" tone="secondary">
          앞의 {hidden}개 구간은 결과 화면에서 볼 수 있어요
        </AppText>
      ) : null}
      <View>
        {shown.map((s) => {
          const best = s.sec === fastest;
          // 가장 느린 구간도 막대가 보이게 60%를 바닥으로 둔다 (결과 화면 구간 기록과 같은 기준)
          const ratio = fastest == null || slowest === fastest ? 1 : 1 - (0.4 * (s.sec - fastest)) / (slowest - fastest);
          return (
            <View key={s.km} style={styles.row} accessible accessibilityLabel={`${s.km}킬로미터 ${formatPace(s.sec)}${best ? ', 가장 빠른 구간' : ''}`}>
              <AppText role="label" tone="secondary" tabular style={styles.km}>
                {s.km}km
              </AppText>
              <View style={styles.flex}>
                <View style={[styles.bar, { width: `${ratio * 100}%`, backgroundColor: best ? colors.action.primary : colors.text.primary }]} />
              </View>
              <AppText role="caption" tone="accent" style={styles.best}>
                {best ? '가장 빠름' : ''}
              </AppText>
              <AppText role="sectionTitle" tabular style={styles.pace}>
                {formatPace(s.sec)}
              </AppText>
            </View>
          );
        })}
        <CurrentSplit engine={engine} />
      </View>
    </View>
  );
}

// 지금 달리는 구간: 몇 m 왔는지와 지금까지 페이스. 초마다 바뀌는 값은 이 줄 안에만 둔다 (VISUAL-QA: metric state 분리)
function CurrentSplit({ engine }: { engine: RunningEngine }) {
  const { colors } = useTheme();
  const sec = useElapsedSec(engine);
  const distance = useRunSnapshot(engine, (s) => s.distanceM);
  const splits = useRunSnapshot(engine, (s) => s.splits);
  const into = Math.max(0, distance - splits.length * 1000);
  const spent = Math.max(0, sec - splits.reduce((a, s) => a + s.sec, 0));
  const pace = into >= MIN_PARTIAL_M ? spent / (into / 1000) : null;
  const km = splits.length + 1;
  return (
    <View
      style={[styles.row, styles.current, { borderColor: colors.border.subtle }]}
      accessible
      accessibilityLabel={`${km}킬로미터 구간 달리는 중, ${Math.round(into)}미터${pace != null ? `, 지금까지 ${formatPace(pace)}` : ''}`}
    >
      <AppText role="label" tone="secondary" tabular style={styles.km}>
        {km}km
      </AppText>
      <AppText role="caption" tone="secondary" tabular style={styles.flex}>
        달리는 중 · {Math.round(into)}m
      </AppText>
      <AppText role="sectionTitle" tabular tone="secondary" style={styles.pace}>
        {formatPace(pace)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  current: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  km: {
    width: 40,
  },
  bar: {
    height: stroke.signal * 2,
    borderRadius: radius.pill,
  },
  best: {
    width: 52,
    textAlign: 'right',
  },
  pace: {
    width: 64,
    textAlign: 'right',
    fontFamily: fontFamily.extrabold,
  },
});
