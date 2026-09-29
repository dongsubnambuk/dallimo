import { useLocalSearchParams } from 'expo-router';

import { parseFriendScenario } from '@/entities/friend/api/mockFriendRepository';
import { FriendProfileScreen } from '@/features/friends/FriendProfileScreen';

export default function FriendProfileRoute() {
  const { userId, scenario } = useLocalSearchParams<{ userId: string; scenario?: string }>();
  return <FriendProfileScreen userId={userId} scenario={parseFriendScenario(scenario)} />;
}
