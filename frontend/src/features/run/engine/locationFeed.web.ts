import * as Location from 'expo-location';

import { fromExpoLocation } from '@/shared/location/expoLocation';

import { deliverLocations } from './recorder';

// 웹(개발 확인용): 백그라운드 task가 없어 탭이 열려 있는 동안만 브라우저 위치를 받는다.
let subscription: Promise<Location.LocationSubscription> | null = null;

export async function startLocationFeed(): Promise<void> {
  subscription ??= Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (l) => {
    deliverLocations([fromExpoLocation(l)]);
  });
  await subscription;
}

export async function stopLocationFeed(): Promise<void> {
  const s = subscription;
  subscription = null;
  (await s?.catch(() => null))?.remove();
}
