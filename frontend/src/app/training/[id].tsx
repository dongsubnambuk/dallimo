import { useLocalSearchParams } from 'expo-router';

import { parseWorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';
import { WorkoutBuilderScreen } from '@/features/training/WorkoutBuilderScreen';

// 인터벌 고치기 (고치면 버전이 오른다)
export default function EditWorkoutRoute() {
  const { id, scenario } = useLocalSearchParams<{ id: string; scenario?: string }>();
  return <WorkoutBuilderScreen id={id} template={null} scenario={parseWorkoutScenario(scenario)} />;
}
