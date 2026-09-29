import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { createMockCourseRepository } from '@/entities/course/api/mockCourseRepository';
import type { CourseDetail } from '@/entities/course/types';
import { getRunPolicy } from '@/entities/run/policy';
import { distanceM, legRoute, type GeoPoint } from '@/shared/geo';
import type { GpsQuality, LocationPermissionState, LocationSource } from '@/shared/location/locationSource';
import { USES_DEVICE_LOCATION } from '@/shared/location/deviceLocation';
import { createDeviceLocationSource } from '@/shared/location/expoLocation';
import { createMockLocationSource, MOCK_POSITION } from '@/shared/location/mockLocationSource';

import type { RunReadyScenario } from './scenario';

// RUN-002 러닝 준비: 권한 → GPS → (코스) 출발점 거리 순서로 확인한다. 앞 단계가 막히면 그 이유만 보여준다 (73장).
export type Readiness =
  | { kind: 'checking' }
  | { kind: 'denied' }
  | { kind: 'acquiring'; position: GeoPoint | null }
  | { kind: 'poor'; position: GeoPoint | null }
  | { kind: 'tooFar'; position: GeoPoint; quality: GpsQuality; startDistanceM: number; radiusM: number }
  | { kind: 'ready'; position: GeoPoint; quality: GpsQuality; startDistanceM: number | null };

export type CourseLoad = { kind: 'none' } | { kind: 'loading' } | { kind: 'error'; retry: () => void } | { kind: 'ready'; course: CourseDetail };

// GPS·위치를 다시 읽는 간격
const POLL_MS = 1000;

// active: 화면이 보이는 동안만 GPS를 켠다 (러닝 화면이 위에 떠 있으면 끈다)
export function useRunReadiness(courseId: string | null, scenario: RunReadyScenario, active: boolean): { readiness: Readiness; course: CourseLoad } {
  const repo = useMemo(() => createMockCourseRepository('normal'), []);
  const courseQuery = useQuery({
    queryKey: ['course', 'detail', courseId, 'normal'],
    queryFn: () => repo.getDetail(courseId as string),
    enabled: courseId != null,
    retry: false,
  });
  const policyQuery = useQuery({ queryKey: ['run', 'policy'], queryFn: getRunPolicy, staleTime: Infinity });

  const start = courseQuery.data?.route[0] ?? null;
  const location = useMemo(
    () => (USES_DEVICE_LOCATION && scenario === 'normal' ? createDeviceLocationSource() : mockLocationFor(scenario, start)),
    // 실제 위치는 코스 출발점과 상관없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, USES_DEVICE_LOCATION && scenario === 'normal' ? null : start],
  );

  // 읽은 값은 어떤 LocationSource에서 왔는지와 함께 둔다. source가 바뀌면 이전 값은 버리고 처음부터 확인한다.
  const [snap, setSnap] = useState<{ source: LocationSource; permission: LocationPermissionState; quality: GpsQuality; position: GeoPoint | null } | null>(null);
  const current = snap?.source === location ? snap : null;
  const permission = current?.permission ?? null;
  const quality = current?.quality ?? 'acquiring';
  const position = current?.position ?? null;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const p = await location.requestPermissions();
      if (!alive) return;
      if (p !== 'granted') {
        setSnap({ source: location, permission: p, quality: 'unavailable', position: null });
        return;
      }
      const read = async () => {
        const [q, pos] = await Promise.all([location.getCurrentQuality(), location.getCurrentPosition().catch(() => null)]);
        if (alive) setSnap({ source: location, permission: p, quality: q, position: pos });
      };
      await read();
      timer = setInterval(read, POLL_MS);
    })();
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      location.stop();
    };
  }, [location, active]);

  const course: CourseLoad =
    courseId == null
      ? { kind: 'none' }
      : courseQuery.isPending
        ? { kind: 'loading' }
        : courseQuery.isError
          ? { kind: 'error', retry: () => courseQuery.refetch() }
          : { kind: 'ready', course: courseQuery.data };

  let readiness: Readiness;
  if (permission == null || (courseId != null && course.kind === 'loading') || !policyQuery.data) readiness = { kind: 'checking' };
  else if (permission !== 'granted') readiness = { kind: 'denied' };
  else if (quality === 'acquiring' || quality === 'unavailable' || !position) readiness = { kind: 'acquiring', position };
  else if (quality === 'poor') readiness = { kind: 'poor', position };
  else if (start) {
    const d = Math.round(distanceM(position, start));
    const radiusM = policyQuery.data.courseStartRadiusM;
    readiness = d > radiusM ? { kind: 'tooFar', position, quality, startDistanceM: d, radiusM } : { kind: 'ready', position, quality, startDistanceM: d };
  } else readiness = { kind: 'ready', position, quality, startDistanceM: null };

  return { readiness, course };
}

// mock 위치: 코스가 있으면 출발점 근처(normal) 또는 멀리(far), 없으면 기본 위치
function mockLocationFor(scenario: RunReadyScenario, start: GeoPoint | null) {
  if (scenario === 'denied') return createMockLocationSource('denied');
  const near = start ? at(start, -18, 24) : MOCK_POSITION;
  if (scenario === 'acquiring') return createMockLocationSource('granted', { position: near, quality: 'acquiring' });
  if (scenario === 'poor') return createMockLocationSource('granted', { position: near, quality: 'poor' });
  if (scenario === 'far') return createMockLocationSource('granted', { position: start ? at(start, -300, -290) : MOCK_POSITION });
  return createMockLocationSource('granted', { position: near });
}

const at = (p: GeoPoint, eastM: number, northM: number) => legRoute(p, [[eastM, northM]])[1];
