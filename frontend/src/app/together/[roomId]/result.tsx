import { useLocalSearchParams } from 'expo-router';

import { LiveResultScreen } from '@/features/together/LiveResultScreen';

export default function LiveResultRoute() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  return <LiveResultScreen roomId={roomId} />;
}
