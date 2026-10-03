import { useLocalSearchParams } from 'expo-router';

import { HeartSensorScreen } from '@/features/heart-sensor/HeartSensorScreen';
import { MOCK_HEART_SCENARIOS, setMockHeartScenario, type MockHeartScenario } from '@/shared/heart/heartSensorTransport';

export default function HeartSensorRoute() {
  // heart: 개발용 가짜 센서 상황 (empty · off · denied)
  const { heart } = useLocalSearchParams<{ heart?: string }>();
  if (MOCK_HEART_SCENARIOS.includes(heart as MockHeartScenario)) setMockHeartScenario(heart as MockHeartScenario);
  return <HeartSensorScreen />;
}
