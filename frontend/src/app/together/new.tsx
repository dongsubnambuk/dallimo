import { useLocalSearchParams } from 'expo-router';

import { CreateRoomScreen } from '@/features/together/CreateRoomScreen';

export default function CreateRoomRoute() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <CreateRoomScreen courseId={courseId ?? null} />;
}
