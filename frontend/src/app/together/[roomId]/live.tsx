import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { parseLiveRunScenario } from '@/entities/live/api/mockLiveChannel';
import { seedDemoRunningRoom } from '@/entities/live/api/mockLiveRoomRepository';
import type { LiveMode } from '@/entities/live/types';
import { TogetherLiveScreen } from '@/features/together/live/TogetherLiveScreen';

const MODES: LiveMode[] = ['LIVE_RACE', 'TIME_ATTACK', 'TOGETHER'];

export default function TogetherLiveRoute() {
  const { roomId, scenario, speed, mode, resume } = useLocalSearchParams<{ roomId: string; scenario?: string; speed?: string; mode?: string; resume?: string }>();
  // 개발 빌드: /together/demo/live?mode=TIME_ATTACK&speed=20 처럼 바로 달리는 방을 연다
  const [id] = useState(() => (__DEV__ && roomId === 'demo' ? seedDemoRunningRoom(MODES.find((m) => m === mode) ?? 'LIVE_RACE') : roomId));
  const factor = __DEV__ && speed ? Math.min(60, Math.max(1, Number(speed) || 1)) : 1;
  // resume: 앱이 꺼지기 전 기록을 이어서 (useRunRecovery)
  return <TogetherLiveScreen roomId={id} scenario={parseLiveRunScenario(scenario)} speed={factor} resume={resume === '1'} />;
}
