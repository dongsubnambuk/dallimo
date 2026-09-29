import * as Location from 'expo-location';

import { getRunPolicySync, gpsQualityFor } from '@/entities/run/policy';

import type { LocationSource, RawLocation } from './locationSource';

// 49.2장 Location Adapter의 실제 구현 (expo-location). Expo API 모양은 이 파일 밖으로 내보내지 않는다.

// 이보다 오래된 위치는 지금 위치로 보지 않는다
const STALE_MS = 10_000;

export function fromExpoLocation(l: Location.LocationObject): RawLocation {
  return {
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    altitude: l.coords.altitude,
    accuracy: l.coords.accuracy,
    speed: l.coords.speed,
    timestamp: l.timestamp,
  };
}

// 탐색 · 러닝 준비용 위치. 러닝 기록은 백그라운드 위치 task(locationFeed)가 따로 받는다.
// GPS 상태를 물으면 그때부터 위치를 계속 받고(watch), stop()으로 끈다.
export function createDeviceLocationSource(): LocationSource {
  let latest: Location.LocationObject | null = null;
  let watching: Promise<Location.LocationSubscription> | null = null;

  const watch = () => {
    watching ??= Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      (l) => {
        latest = l;
      },
    );
    watching.catch(() => {
      watching = null;
    });
  };
  const fresh = () => (latest && Date.now() - latest.timestamp <= STALE_MS ? latest : null);

  return {
    async requestPermissions() {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) return 'granted';
      if (!current.canAskAgain) return 'denied';
      const asked = await Location.requestForegroundPermissionsAsync();
      return asked.granted ? 'granted' : 'denied';
    },
    async getCurrentPosition() {
      // 러닝 준비처럼 계속 보고 있으면 받은 위치를 쓰고, 탐색처럼 한 번만 필요하면 한 번 읽는다
      if (watching) {
        const l = fresh();
        if (!l) throw new Error('no location yet');
        return { latitude: l.coords.latitude, longitude: l.coords.longitude };
      }
      const l = fresh() ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      return { latitude: l.coords.latitude, longitude: l.coords.longitude };
    },
    async getCurrentQuality() {
      watch();
      if (!(await Location.hasServicesEnabledAsync().catch(() => true))) return 'unavailable';
      const l = fresh();
      return l ? gpsQualityFor(l.coords.accuracy, getRunPolicySync()) : 'acquiring';
    },
    async stop() {
      const w = watching;
      watching = null;
      latest = null;
      (await w?.catch(() => null))?.remove();
    },
  };
}
