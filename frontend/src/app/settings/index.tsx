import { useLocalSearchParams } from 'expo-router';

import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { MOCK_WATCH_SCENARIOS, setMockWatchScenario, type MockWatchScenario } from '@/shared/watch/watchTransport';

// 개발용 가짜 워치 상황: ?watch=none · unreachable
export default function SettingsRoute() {
  const { watch } = useLocalSearchParams<{ watch?: string }>();
  if (MOCK_WATCH_SCENARIOS.includes(watch as MockWatchScenario)) setMockWatchScenario(watch as MockWatchScenario);
  return <SettingsScreen />;
}
