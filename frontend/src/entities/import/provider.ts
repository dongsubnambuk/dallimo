import { Platform } from 'react-native';

import { MOCK_COURSE_ROUTES } from '@/entities/course/api/mockCourseRoutes';
import { distanceM, loopRoute, pointAt, type GeoPoint } from '@/shared/geo';
import { nativeHealth } from '@/shared/health/appleHealth';

import type { HealthPoint, HealthRun, ImportSource } from './types';

// 122.2장 Provider Adapter: 기기의 건강 앱에서 달리기를 읽는 경계.
// 아이폰 개발 빌드: Apple 건강(HealthKit, modules/dallimo-health). 그 밖(웹 · 개발 확인): 개발용 가짜 건강 앱
export interface HealthProvider {
  source: ImportSource;
  // 이 기기에서 쓸 수 있는가
  available(): boolean;
  // 읽기 권한을 묻는다 (연결하기)
  connect(): Promise<boolean>;
  // sinceMs 이후 달리기, 최근 먼저. 달리모가 워치로 함께 기록한 운동은 뺀다
  listRuns(sinceMs: number, limit: number): Promise<HealthRun[]>;
  // 운동 하나의 경로 (시각 순, 실내면 빈 목록)
  route(id: string): Promise<HealthPoint[]>;
}

const appleHealth: HealthProvider = {
  source: 'APPLE_HEALTH',
  available: () => nativeHealth != null && nativeHealth.isAvailable(),
  connect: async () => (nativeHealth ? nativeHealth.requestAuthorization() : false),
  async listRuns(sinceMs, limit) {
    if (!nativeHealth) return [];
    const list = await nativeHealth.getRunningWorkouts(sinceMs, limit);
    return list
      .filter((w) => !w.dallimoRunUuid)
      .map((w) => ({
        id: w.id,
        source: 'APPLE_HEALTH',
        startedAt: w.startMs,
        endedAt: w.endMs,
        activeSec: Math.round(w.durationSec),
        distanceM: w.distanceM != null ? Math.round(w.distanceM) : null,
        sourceName: w.sourceName,
        deviceName: w.deviceName ?? null,
        indoor: w.indoor,
      }));
  },
  async route(id) {
    if (!nativeHealth) return [];
    return (await nativeHealth.getWorkoutRoute(id)).map((l) => ({
      latitude: l.latitude,
      longitude: l.longitude,
      altitude: l.altitude,
      // HealthKit은 모르면 음수
      ...(l.horizontalAccuracy >= 0 ? { accuracy: l.horizontalAccuracy } : {}),
      ...(l.speed != null ? { speed: l.speed } : {}),
      recordedAt: l.timestampMs,
    }));
  },
};

// ── 개발용 가짜 건강 앱 (웹 · 개발 빌드 확인) ──
// 이틀 전 수성못 둘레길 한 바퀴(서버 로컬 코스와 같은 경로), 어제 동네 한 바퀴, 오늘 아침 실내 달리기(경로 없음)
export const MOCK_HEALTH_SCENARIOS = ['normal', 'empty', 'unavailable', 'denied'] as const;
export type MockHealthScenario = (typeof MOCK_HEALTH_SCENARIOS)[number];
let scenario: MockHealthScenario = 'normal';

export function setMockHealthScenario(s: MockHealthScenario) {
  scenario = s;
}

const DAY = 86_400_000;
const PACE_MPS = 1000 / 320;

function mockRoute(path: GeoPoint[], startedAt: number): HealthPoint[] {
  const length = path.slice(1).reduce((a, p, i) => a + distanceM(path[i], p), 0);
  const seconds = Math.round(length / PACE_MPS);
  return Array.from({ length: seconds + 1 }, (_, s) => {
    const p = pointAt(path, s / seconds);
    return { latitude: p.latitude, longitude: p.longitude, accuracy: 5, speed: PACE_MPS, recordedAt: startedAt + s * 1000 };
  });
}

function mockRuns(): (HealthRun & { path: GeoPoint[] | null })[] {
  const today = new Date();
  today.setHours(6, 40, 0, 0);
  const t = today.getTime() > Date.now() ? today.getTime() - DAY : today.getTime();
  const lake = MOCK_COURSE_ROUTES['c-suseongmot'].route.map(([latitude, longitude]) => ({ latitude, longitude }));
  const loop = loopRoute({ latitude: 35.8335, longitude: 128.6255 }, 380, 260, 48, 0.06, 1.3);
  const make = (id: string, startedAt: number, path: GeoPoint[] | null, indoorM = 0) => {
    const length = path ? path.slice(1).reduce((a, p, i) => a + distanceM(path[i], p), 0) : indoorM;
    const sec = Math.round(length / PACE_MPS);
    return {
      id,
      source: 'APPLE_HEALTH' as const,
      startedAt,
      endedAt: startedAt + sec * 1000,
      activeSec: sec,
      distanceM: Math.round(length),
      sourceName: '운동',
      deviceName: 'Apple Watch',
      indoor: path == null,
      path,
    };
  };
  return [
    make('MOCK-TREADMILL', t - 30 * 60_000, null, 5000),
    make('MOCK-LOOP', t - DAY + 13 * 3_600_000, loop),
    make('MOCK-LAKE', t - 2 * DAY, lake),
  ];
}

const mockHealth: HealthProvider = {
  source: 'APPLE_HEALTH',
  available: () => scenario !== 'unavailable',
  connect: async () => scenario !== 'denied',
  async listRuns(sinceMs, limit) {
    await new Promise((r) => setTimeout(r, 300));
    if (scenario === 'empty') return [];
    return mockRuns()
      .filter((r) => r.startedAt >= sinceMs)
      .slice(0, limit)
      .map(({ path: _path, ...r }) => r);
  },
  async route(id) {
    const run = mockRuns().find((r) => r.id === id);
    return run?.path ? mockRoute(run.path, run.startedAt) : [];
  },
};

/** 이 기기의 건강 앱. 아이폰 개발 빌드면 Apple 건강, 아니면 개발용 가짜 (배포 빌드의 웹 · 안드로이드는 쓸 수 없음) */
export function getHealthProvider(): HealthProvider {
  if (nativeHealth) return appleHealth;
  if (__DEV__) return mockHealth;
  return { ...appleHealth, available: () => false };
}

export const healthPlatformNote = Platform.OS === 'ios' ? null : 'Apple 건강은 아이폰에서 쓸 수 있어요';
