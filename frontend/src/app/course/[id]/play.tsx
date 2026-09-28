import { useLocalSearchParams } from 'expo-router';

import { parseCourseScenario } from '@/features/course/scenario';
import { PlayModeSheet } from '@/features/play-mode/PlayModeSheet';

// 72장 4번 Play Mode Selector. 코스 상세 위에 뜨는 하단 sheet (89장). 표시 방식은 루트 _layout에서 transparentModal로 정한다.
export default function PlayModeRoute() {
  const { id, scenario } = useLocalSearchParams<{ id: string; scenario?: string }>();
  return <PlayModeSheet id={id} scenario={parseCourseScenario(scenario)} />;
}
