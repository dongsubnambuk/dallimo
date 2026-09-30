import { requireOptionalNativeModule } from 'expo';

// 로컬 네이티브 모듈 modules/dallimo-health (Swift, HealthKit). 아이폰 개발 빌드에만 있고 웹 · 안드로이드 · Expo Go에는 없다(null).
export type NativeHealthWorkout = {
  id: string;
  startMs: number;
  endMs: number;
  // 일시정지를 뺀 운동 시간(초)
  durationSec: number;
  distanceM?: number;
  sourceName: string;
  bundleId: string;
  deviceName?: string;
  indoor: boolean;
  // 달리모가 워치로 함께 기록한 운동이면 그 러닝의 clientRunUuid (가져오기 후보에서 뺀다)
  dallimoRunUuid?: string;
};

export type NativeHealthLocation = {
  latitude: number;
  longitude: number;
  altitude: number;
  horizontalAccuracy: number;
  speed?: number;
  timestampMs: number;
};

type DallimoHealthModule = {
  isAvailable(): boolean;
  requestAuthorization(): Promise<boolean>;
  getRunningWorkouts(sinceMs: number, limit: number): Promise<NativeHealthWorkout[]>;
  getWorkoutRoute(workoutId: string): Promise<NativeHealthLocation[]>;
};

export const nativeHealth = requireOptionalNativeModule<DallimoHealthModule>('DallimoHealth');
