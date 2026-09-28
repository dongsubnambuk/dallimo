import { useLocalSearchParams } from 'expo-router';

import { parseHistoryScenario } from '@/entities/run/api/mockRunResultRepository';
import { RunHistoryScreen } from '@/features/my/RunHistoryScreen';

export default function RunHistoryRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <RunHistoryScreen scenario={parseHistoryScenario(scenario)} />;
}
