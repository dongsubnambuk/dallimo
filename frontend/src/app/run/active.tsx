import { useLocalSearchParams } from 'expo-router';

import type { RunPlanParams } from '@/features/run-ready/runPlanParams';
import { RunStartScreen } from '@/features/run-start/RunStartScreen';

export default function ActiveRunRoute() {
  const params = useLocalSearchParams<RunPlanParams>();
  return <RunStartScreen params={params} />;
}
