import { useLocalSearchParams } from 'expo-router';

import { PendingScreen } from '@/features/pending/PendingScreen';

export default function TogetherTab() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <PendingScreen title="함께 달리기" order="Together 단계(72장 10번)" handoff={courseId ? `코스 ${courseId}로 방 만들기` : null} />;
}
