import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { parseLiveScenario, seedDemoRoom } from '@/entities/live/api/mockLiveRoomRepository';
import { WaitingRoomScreen } from '@/features/together/WaitingRoomScreen';

export default function WaitingRoomRoute() {
  const { roomId, scenario } = useLocalSearchParams<{ roomId: string; scenario?: string }>();
  const parsed = parseLiveScenario(scenario);
  // 개발 빌드: /together/demo?scenario=disconnected 처럼 친구가 차례로 들어오는 방을 바로 연다
  const [id] = useState(() => (__DEV__ && roomId === 'demo' ? seedDemoRoom(parsed) : roomId));
  return <WaitingRoomScreen roomId={id} scenario={roomId === 'demo' ? 'normal' : parsed} />;
}
