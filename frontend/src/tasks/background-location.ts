import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { deliverLocations } from '@/features/run/engine/recorder';
import { fromExpoLocation } from '@/shared/location/expoLocation';

// 9.2장 tasks/background-location. 앱 시작 때 불러와야 한다(_layout).
// OS가 백그라운드에서 앱을 다시 켜 위치를 넘길 때도 이 정의가 먼저 등록되어 있어야 한다.
// 29.3장: 여기서는 받은 위치를 저장소로 넘기기만 한다. 네트워크 호출 · 화면 상태 변경은 하지 않는다.
export const BACKGROUND_LOCATION_TASK = 'dallimo-run-location';

TaskManager.defineTask<{ locations: LocationObject[] }>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await deliverLocations(data.locations.map(fromExpoLocation));
});
