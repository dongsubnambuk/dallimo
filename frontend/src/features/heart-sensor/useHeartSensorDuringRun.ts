import { useEffect } from 'react';

import { pushHeartRate } from '@/features/run/heartRateLive';
import { heartSensor } from '@/shared/heart/heartSensorTransport';
import { usePreferences } from '@/shared/preferences';

// 출발 카운트다운부터 러닝을 끝낼 때까지 저장한 심박 센서에 연결한다 (결정 로그 80항).
// 센서가 범위 밖이면 들어올 때 연결되고, 달리는 중에 끊기면 다시 연결한다. 화면을 나가면 끊는다 (센서 배터리).
export function useHeartSensorDuringRun() {
  const id = usePreferences().heartSensor?.id ?? null;
  useEffect(() => {
    if (!id || !heartSensor.supported) return;
    const off = heartSensor.onHeartRate((bpm, at) => pushHeartRate(bpm, at, 'sensor'));
    heartSensor.connect(id);
    return () => {
      off();
      heartSensor.disconnect();
    };
  }, [id]);
}
