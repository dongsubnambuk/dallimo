import { useLocalSearchParams } from 'expo-router';

import { isLegalKind, LegalScreen } from '@/features/settings/LegalScreen';

export default function LegalRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return <LegalScreen kind={isLegalKind(kind) ? kind : 'terms'} />;
}
