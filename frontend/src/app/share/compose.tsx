import { useLocalSearchParams } from 'expo-router';

import { parseShareScenario } from '@/entities/share/api/mockShareRepository';
import { ShareComposerScreen } from '@/features/share/ShareComposerScreen';

export default function ShareComposeRoute() {
  const { runId, roomId, scenario } = useLocalSearchParams<{ runId?: string; roomId?: string; scenario?: string }>();
  return <ShareComposerScreen runId={runId ?? null} roomId={roomId ?? null} scenario={parseShareScenario(scenario)} />;
}
