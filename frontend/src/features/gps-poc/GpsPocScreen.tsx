import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { getRunPolicySync } from '@/entities/run/policy';
import type { LocalRunStats } from '@/features/run/engine/localRunStore';
import { getRunStore } from '@/features/run/engine/runStore';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import { formatDuration } from '@/shared/format';

import { exportFileName, toGpx, toJson } from './exportRun';
import { shareTextFile } from './shareFile';

// GPS PoC(WBS 1) 개발용 화면. 제품 화면이 아니다.
// 휴대폰 SQLite에 남은 러닝마다 17.1 · 18장 확인 값(point 수, 평균 정확도, 거리에서 뺀 point 비율, 기록 간격)을 보고
// 원본을 JSON · GPX로 내보내 정책값(10.5장)을 정하는 데 쓴다.
const QUERY_KEY = ['gps-poc', 'runs'];

export function GpsPocScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const runs = useQuery({ queryKey: QUERY_KEY, queryFn: async () => (await getRunStore()).listRuns(30) });
  const policy = getRunPolicySync();

  // 러닝을 마치고 돌아오면 다시 읽는다
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }, [queryClient]),
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      data={runs.data ?? []}
      keyExtractor={(r) => r.clientRunUuid}
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText role="body" tone="secondary">
            휴대폰에 저장된 러닝 기록이에요. 야외 테스트 뒤 JSON을 내보내 공유해 주세요.
          </AppText>
          <AppText role="caption" tone="secondary">
            {`기준(PoC 시작값): 양호 ≤ ${policy.gpsGoodAccuracyM}m · 거리 제외 > ${policy.gpsRequiredAccuracyM}m · 순간 이동 > ${policy.gpsMaxSpeedMps}m/s`}
          </AppText>
        </View>
      }
      ListEmptyComponent={
        <AppText role="body" tone="secondary" style={styles.empty}>
          {runs.isPending ? '불러오는 중' : runs.isError ? '기록을 읽지 못했어요' : '아직 기록이 없어요. 달리기 탭에서 달려 보세요.'}
        </AppText>
      }
      renderItem={({ item }) => <RunCard run={item} onDeleted={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })} />}
    />
  );
}

function RunCard({ run, onDeleted }: { run: LocalRunStats; onDeleted: () => void }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const pct = (n: number) => (run.pointCount ? `${Math.round((n / run.pointCount) * 1000) / 10}%` : '-');
  const spanSec = run.firstPointAt != null && run.lastPointAt != null ? (run.lastPointAt - run.firstPointAt) / 1000 : 0;
  // 평균 기록 간격: 1초에 가까워야 한다. 화면을 끈 동안 끊겼다면 크게 늘어난다
  const interval = run.pointCount > 1 ? `${(spanSec / (run.pointCount - 1)).toFixed(2)}초` : '-';
  const started = new Date(run.startedAt);

  const exportAs = async (ext: 'json' | 'gpx') => {
    setBusy(true);
    try {
      const store = await getRunStore();
      const [points, segments] = await Promise.all([store.getPoints(run.clientRunUuid), store.getSegments(run.clientRunUuid)]);
      const e = { run, segments, points };
      await shareTextFile(exportFileName(run, ext), ext === 'json' ? toJson(e) : toGpx(e), ext === 'json' ? 'application/json' : 'application/gpx+xml');
    } catch (err) {
      Alert.alert('내보내지 못했어요', String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const run_ = async () => {
      await (await getRunStore()).deleteRun(run.clientRunUuid);
      onDeleted();
    };
    if (Platform.OS === 'web') {
      run_();
      return;
    }
    Alert.alert('이 기록을 지울까요?', '휴대폰에 저장된 원본 point가 모두 지워져요.', [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: run_ },
    ]);
  };

  const rows: [string, string][] = [
    ['상태', run.status],
    ['달린 시간', formatDuration(Math.round(run.elapsedMs / 1000))],
    ['point', `${run.pointCount}개 · 평균 간격 ${interval}`],
    ['평균 정확도', run.avgAccuracyM != null ? `${run.avgAccuracyM.toFixed(1)}m` : '-'],
    ['정확도 낮음', `${run.lowAccuracyCount}개 (${pct(run.lowAccuracyCount)})`],
    ['순간 이동', `${run.jumpCount}개 (${pct(run.jumpCount)})`],
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }]}>
      <AppText role="sectionTitle">
        {`${started.getMonth() + 1}월 ${started.getDate()}일 ${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')} · ${MODE_TITLE[run.mode]}`}
      </AppText>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.row}>
          <AppText role="label" tone="secondary">
            {k}
          </AppText>
          <AppText role="label" tabular>
            {v}
          </AppText>
        </View>
      ))}
      <View style={styles.actions}>
        <SecondaryButton label="JSON 내보내기" size="sm" emphasized disabled={busy} onPress={() => exportAs('json')} />
        <SecondaryButton label="GPX 내보내기" size="sm" disabled={busy} onPress={() => exportAs('gpx')} />
        <SecondaryButton label="지우기" size="sm" disabled={busy || run.status === 'RUNNING' || run.status === 'PAUSED'} onPress={remove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
