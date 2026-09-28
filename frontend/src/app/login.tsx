import { useLocalSearchParams } from 'expo-router';

import { parseLoginScenario } from '@/entities/auth/api/mockAuthRepository';
import { LoginScreen } from '@/features/auth/LoginScreen';

export default function LoginRoute() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return <LoginScreen scenario={parseLoginScenario(scenario)} />;
}
