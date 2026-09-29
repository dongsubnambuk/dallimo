import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { CourseSummary } from '@/entities/course/types';
import { distanceM, type GeoPoint } from '@/shared/geo';
import { USES_DEVICE_LOCATION } from '@/shared/location/deviceLocation';
import { createDeviceLocationSource } from '@/shared/location/expoLocation';
import { createMockLocationSource } from '@/shared/location/mockLocationSource';
import { getCourseRepository } from '@/entities/course/api';
import { DEFAULT_REGION_CENTER } from '@/entities/course/api/mockCourseRepository';
import type { ExploreScenario } from './api/scenario';

export type NearbyState =
  | { kind: 'locating' }
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  // locationDenied: 위치 권한이 없어 기본 지역 코스를 보여주는 중 (LOC-002: 조회 기능 유지)
  | { kind: 'ready'; courses: CourseSummary[]; locationDenied: boolean };

// CRS-001 주변 코스. 위치 권한 → 현재 위치 → 주변 코스 순서로 조회한다.
// 권한이 없으면 기본 지역 코스를 조회한다 (LOC-002).
// 서버 상태는 TanStack Query로 관리한다 (9.1장).
// area: 지도를 옮겨 "이 지역에서 찾기"를 누른 곳 (CRS-002). 있으면 내 위치 대신 그 중심 · 반경으로 찾는다
export function useNearbyCourses(scenario: ExploreScenario, radiusM: number, area: { center: GeoPoint; radiusM: number } | null = null) {
  const services = useMemo(
    () => ({
      location:
        USES_DEVICE_LOCATION && scenario === 'normal' ? createDeviceLocationSource() : createMockLocationSource(scenario === 'denied' ? 'denied' : 'granted'),
      courses: getCourseRepository(scenario === 'denied' ? 'normal' : scenario),
    }),
    [scenario],
  );

  const location = useQuery({
    queryKey: ['location', scenario],
    queryFn: async () => {
      const permission = await services.location.requestPermissions();
      if (permission !== 'granted') return { permission, position: null };
      return { permission, position: await services.location.getCurrentPosition() };
    },
    staleTime: 60_000,
  });

  const position = location.data?.position ?? null;
  const denied = location.data != null && location.data.permission !== 'granted';
  const center = area?.center ?? position ?? (denied ? DEFAULT_REGION_CENTER : null);
  const radius = area?.radiusM ?? radiusM;

  const courses = useQuery({
    queryKey: ['courses', 'nearby', center?.latitude, center?.longitude, radius, scenario],
    queryFn: async () => {
      const list = await services.courses.getNearby({ center: center!, radiusM: radius });
      // 다른 지역에서 찾았으면 출발점까지 거리는 내 위치 기준으로 다시 잰다 (모르면 없음)
      if (!area) return list;
      return list.map((c) => ({ ...c, startDistanceM: position ? Math.round(distanceM(position, c.displayRoute[0])) : null }));
    },
    enabled: center != null,
    retry: false,
  });

  let state: NearbyState;
  if (location.isPending) state = { kind: 'locating' };
  else if (courses.isPending) state = { kind: 'loading' };
  else if (courses.isError) state = { kind: 'error', retry: () => courses.refetch() };
  else state = { kind: 'ready', courses: courses.data ?? [], locationDenied: denied };

  return { state, position };
}
