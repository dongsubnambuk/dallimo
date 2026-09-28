import { useLocalSearchParams } from 'expo-router';

import { parseRegisterScenario } from '@/entities/course/api/mockCourseRegistration';
import { CourseCreateScreen } from '@/features/course-create/CourseCreateScreen';

export default function CourseCreateRoute() {
  const { runId, scenario } = useLocalSearchParams<{ runId?: string; scenario?: string }>();
  return <CourseCreateScreen runId={runId ?? ''} scenario={parseRegisterScenario(scenario)} />;
}
