import { useLocalSearchParams } from 'expo-router';

import { parseWorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';
import { WorkoutBuilderScreen } from '@/features/training/WorkoutBuilderScreen';

// 인터벌 만들기. template: 추천 인터벌을 고쳐서 저장할 때 (400m · 1min · 1km)
export default function NewWorkoutRoute() {
  const { template, scenario } = useLocalSearchParams<{ template?: string; scenario?: string }>();
  return <WorkoutBuilderScreen id={null} template={template ?? null} scenario={parseWorkoutScenario(scenario)} />;
}
