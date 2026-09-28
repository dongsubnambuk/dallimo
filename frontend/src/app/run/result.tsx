import { router, useLocalSearchParams } from 'expo-router';

import { PendingScreen } from '@/features/pending/PendingScreen';
import { MODE_TITLE } from '@/features/run-ready/runPlanParams';
import type { RunMode } from '@/entities/run/types';
import { formatDistanceKm, formatDuration, formatPace } from '@/shared/format';

// SCR-R04 러닝 결과는 72장 8번 단계. 그 전까지 Active Run이 넘긴 결과를 표시해 흐름을 확인한다.
export default function RunResultRoute() {
  const p = useLocalSearchParams<{ mode?: string; distanceM?: string; activeSec?: string; avgPaceSec?: string; synced?: string }>();
  const summary = [
    MODE_TITLE[(p.mode as RunMode) ?? 'FREE'] ?? p.mode,
    `${formatDistanceKm(Number(p.distanceM))}km`,
    formatDuration(Number(p.activeSec)),
    `평균 ${formatPace(p.avgPaceSec ? Number(p.avgPaceSec) : null)}`,
    p.synced === '0' ? '휴대폰에만 저장됨' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return <PendingScreen title="러닝 결과" order="Result 단계(72장 8번)" handoff={summary} action={{ label: '달리기 탭으로', onPress: () => router.back() }} />;
}
