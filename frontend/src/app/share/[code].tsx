import { useLocalSearchParams } from 'expo-router';

import { ShareLinkScreen } from '@/features/share/ShareLinkScreen';

export default function ShareLinkRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <ShareLinkScreen code={code} />;
}
