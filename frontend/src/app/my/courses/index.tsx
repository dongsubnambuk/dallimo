import { useLocalSearchParams } from 'expo-router';

import type { MockCourseScenario } from '@/entities/course/api/mockCourseRepository';
import type { MyCourseKind } from '@/entities/course/types';
import { MyCoursesScreen } from '@/features/my/MyCoursesScreen';

const TABS: MyCourseKind[] = ['created', 'saved', 'finished'];
const SCENARIOS: MockCourseScenario[] = ['normal', 'loading', 'empty', 'error'];

export default function MyCoursesRoute() {
  const { tab, scenario } = useLocalSearchParams<{ tab?: string; scenario?: string }>();
  const s = __DEV__ ? SCENARIOS.find((x) => x === scenario) : undefined;
  return <MyCoursesScreen initialTab={TABS.find((t) => t === tab) ?? 'created'} scenario={s ?? 'normal'} />;
}
