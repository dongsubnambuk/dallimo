import { useLocalSearchParams } from 'expo-router';

import { parseActiveRunScenario } from '@/features/run/engine/mockRunningEngine';
import type { RunPlanParams } from '@/features/run-ready/runPlanParams';
import { RunStartScreen } from '@/features/run-start/RunStartScreen';

export default function ActiveRunRoute() {
  const { scenario, speed, ...params } = useLocalSearchParams<RunPlanParams & { scenario?: string; speed?: string }>();
  // speed: 개발 빌드에서 mock 러너의 시간 배속 (QA용)
  const factor = __DEV__ && speed ? Math.min(60, Math.max(1, Number(speed) || 1)) : 1;
  return <RunStartScreen params={params} scenario={parseActiveRunScenario(scenario)} speed={factor} />;
}
