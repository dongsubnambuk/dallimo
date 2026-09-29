import { useLocalSearchParams } from 'expo-router';

import { parseWorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';
import { WorkoutListScreen } from '@/features/training/WorkoutListScreen';

// 인터벌 달리기 목록. 개발용 상황: ?scenario=empty · error
export default function TrainingRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <WorkoutListScreen scenario={parseWorkoutScenario(scenario)} />;
}
