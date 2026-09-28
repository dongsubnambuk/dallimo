import { useLocalSearchParams } from 'expo-router';

import { RunDetailScreen } from '@/features/my/RunDetailScreen';

export default function RunDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RunDetailScreen id={id} />;
}
