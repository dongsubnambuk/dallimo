import * as Location from 'expo-location';

import { BACKGROUND_LOCATION_TASK } from '@/tasks/background-location';

// 러닝 기록용 위치 수신 (iOS · Android). 49.2장 startForeground · startBackground에 해당한다.
// iOS는 앱을 쓰는 동안 시작한 위치 업데이트를 화면이 꺼져도 이어서 준다(파란 위치 표시).
// Android는 알림이 있는 foreground service로 이어서 받는다. 두 경우 모두 '앱 사용 중 허용' 권한이면 된다.
// 받은 위치는 백그라운드 task → recorder로 간다.
//
// 20.2장 GPS 샘플링(시간/거리 interval, 배터리)은 GPS PoC에서 정한다. 아래는 PoC 시작값.
const RECORDING_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  // Android: 1초마다. iOS는 distanceInterval만 쓰며 보통 1초마다 준다
  timeInterval: 1000,
  distanceInterval: 0,
  // iOS: 운동용으로 알려 정확도를 높이고, 멈춰 있어도 업데이트를 끊지 않는다
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: '달리모',
    notificationBody: '달리기를 기록하고 있어요',
    killServiceOnDestroy: false,
  },
};

export async function startLocationFeed(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, RECORDING_OPTIONS);
}

export async function stopLocationFeed(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
