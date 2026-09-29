import { useLocalSearchParams } from 'expo-router';

import { parseActivityScenario } from '@/entities/activity/api/mockActivityRepository';
import { ActivityScreen } from '@/features/activity/ActivityScreen';

// SCR-M06 친구 활동. 개발용 상황: ?scenario=empty · error
export default function ActivityRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <ActivityScreen scenario={parseActivityScenario(scenario)} />;
}
