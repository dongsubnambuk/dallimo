import { useLocalSearchParams } from 'expo-router';

import { parseFriendScenario } from '@/entities/friend/api/mockFriendRepository';
import { FriendsScreen } from '@/features/friends/FriendsScreen';

export default function FriendsRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <FriendsScreen scenario={parseFriendScenario(scenario)} />;
}
