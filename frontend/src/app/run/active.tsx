import { useLocalSearchParams } from 'expo-router';

import type { ActiveRunOptions } from '@/features/run/engine/activeRunSession';
import { parseActiveRunScenario } from '@/features/run/engine/mockRunningEngine';
import type { RunPlanParams } from '@/features/run-ready/runPlanParams';
import { RunStartScreen } from '@/features/run-start/RunStartScreen';
import { USES_DEVICE_LOCATION } from '@/shared/location/deviceLocation';
import { MOCK_WATCH_SCENARIOS, setMockWatchScenario, type MockWatchScenario } from '@/shared/watch/watchTransport';

export default function ActiveRunRoute() {
  const { scenario, speed, gps, resume, watch, ...params } = useLocalSearchParams<
    RunPlanParams & { scenario?: string; speed?: string; gps?: string; resume?: string; watch?: string }
  >();
  // watch: 개발용 가짜 워치 상황 (none · unreachable)
  if (MOCK_WATCH_SCENARIOS.includes(watch as MockWatchScenario)) setMockWatchScenario(watch as MockWatchScenario);
  // resume: 앱이 꺼지기 전 기록을 이어서 (useRunRecovery)
  // scenario · speed: 개발 빌드에서 mock 러너로 상태 QA. gps=device: 웹에서도 브라우저 위치로 실제 기록 (개발용)
  const mockScenario = parseActiveRunScenario(scenario);
  const factor = __DEV__ && speed ? Math.min(60, Math.max(1, Number(speed) || 1)) : 1;
  const device = resume === '1' || (mockScenario === 'normal' && factor === 1 && (USES_DEVICE_LOCATION || (__DEV__ && gps === 'device')));
  const options: ActiveRunOptions = device ? { kind: 'device' } : { kind: 'mock', scenario: mockScenario, speed: factor };
  return <RunStartScreen params={params} options={options} recovering={resume === '1' || (!device && mockScenario === 'recovering')} />;
}
