import { useLocalSearchParams } from 'expo-router';

import type { RunPlanParams } from '@/features/run-ready/runPlanParams';
import { RunReadyScreen } from '@/features/run-ready/RunReadyScreen';
import { parseRunReadyScenario } from '@/features/run-ready/scenario';

export default function RunTab() {
  const { scenario, ...params } = useLocalSearchParams<RunPlanParams & { scenario?: string }>();
  return <RunReadyScreen params={params} scenario={parseRunReadyScenario(scenario)} />;
}
