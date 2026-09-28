import { useLocalSearchParams } from 'expo-router';

import { LegalScreen } from '@/features/settings/LegalScreen';

export default function LegalRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return <LegalScreen kind={kind === 'privacy' ? 'privacy' : 'terms'} />;
}
