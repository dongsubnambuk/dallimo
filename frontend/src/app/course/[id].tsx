import { Stack, useLocalSearchParams } from 'expo-router';

import { CourseDetailScreen } from '@/features/course/CourseDetailScreen';
import { parseCourseScenario } from '@/features/course/scenario';

// SCR-E03 코스 상세. 지도 위에 자체 헤더(뒤로·저장·공유)를 두므로 기본 헤더를 숨긴다.
// 개발 빌드: /course/[id]?scenario=loading|hidden|error|noRecord|rankingUnavailable
export default function CourseDetailRoute() {
  const { id, scenario } = useLocalSearchParams<{ id: string; scenario?: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CourseDetailScreen id={id} scenario={parseCourseScenario(scenario)} />
    </>
  );
}
