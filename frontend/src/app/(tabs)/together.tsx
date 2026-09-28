import { useLocalSearchParams } from 'expo-router';

import { parseLiveScenario } from '@/entities/live/api/mockLiveRoomRepository';
import { TogetherHomeScreen } from '@/features/together/TogetherHomeScreen';

export default function TogetherTab() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <TogetherHomeScreen scenario={parseLiveScenario(scenario)} />;
}
