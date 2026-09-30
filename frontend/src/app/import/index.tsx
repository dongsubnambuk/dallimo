import { useLocalSearchParams } from 'expo-router';

import { MOCK_HEALTH_SCENARIOS, setMockHealthScenario, type MockHealthScenario } from '@/entities/import/provider';
import { ImportScreen } from '@/features/import/ImportScreen';

// 122.3장 외부 기록 가져오기. 개발용 가짜 건강 앱 상황: ?health=empty · unavailable · denied
export default function ImportRoute() {
  const { health } = useLocalSearchParams<{ health?: string }>();
  if (MOCK_HEALTH_SCENARIOS.includes(health as MockHealthScenario)) setMockHealthScenario(health as MockHealthScenario);
  return <ImportScreen />;
}
