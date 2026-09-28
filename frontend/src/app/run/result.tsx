import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { parseResultScenario, seedDemoResult } from '@/entities/run/api/mockRunResultRepository';
import { RunResultScreen } from '@/features/run-result/RunResultScreen';

const DEMOS = ['pb', 'noPb', 'free', 'dnf'] as const;

export default function RunResultRoute() {
  const { id, demo, scenario } = useLocalSearchParams<{ id?: string; demo?: string; scenario?: string }>();
  // 개발 빌드: /run/result?demo=pb&scenario=unverified 처럼 예시 결과를 바로 연다
  const [resultId] = useState(() => {
    const kind = DEMOS.find((d) => d === demo);
    return __DEV__ && kind ? seedDemoResult(kind, parseResultScenario(scenario)) : (id ?? '');
  });
  return <RunResultScreen id={resultId} />;
}
