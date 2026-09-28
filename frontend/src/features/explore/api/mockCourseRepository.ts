import type { CourseSummary, NearbyCourseQuery } from '@/entities/course/types';
import { distanceM, loopRoute, type GeoPoint } from '@/shared/geo';

import { CourseRepositoryError, type CourseRepository } from './courseRepository';
import { MOCK_COURSE_ROUTES } from './mockCourseRoutes';
import type { ExploreScenario } from './scenario';

// 실제 API 전까지 쓰는 예시 데이터. 대구 수성못 주변 (명세서 91장 예시 지역).
// 경로는 OpenStreetMap의 실제 호안·강변·도로를 따른다 (mockCourseRoutes.ts). 거리는 경로 길이에서 계산한다.
type MockCourse = Omit<CourseSummary, 'startDistanceM'>;

const route = (id: string): GeoPoint[] => MOCK_COURSE_ROUTES[id].route.map(([latitude, longitude]) => ({ latitude, longitude }));
// 100m 단위로 반올림한 경로 길이
const lengthOf = (id: string) => Math.round(MOCK_COURSE_ROUTES[id].lengthM / 100) * 100;
// 6'00"/km 기준 예상 시간
const estimateOf = (id: string) => Math.round((lengthOf(id) / 1000) * 360);

const MOCK_COURSES: MockCourse[] = [
  {
    id: 'c-suseongmot',
    name: '수성못 둘레길',
    distanceM: lengthOf('c-suseongmot'),
    tags: ['평지', '야간 밝음'],
    displayRoute: route('c-suseongmot'),
    myBestSec: 612,
    leaderSec: 468,
    estimatedSec: estimateOf('c-suseongmot'),
    finisherCount: 1284,
    weeklyRunnerCount: 128,
  },
  {
    id: 'c-deuran',
    name: '들안로 왕복',
    distanceM: lengthOf('c-deuran'),
    tags: ['신호 적음'],
    displayRoute: route('c-deuran'),
    myBestSec: null,
    leaderSec: 552,
    estimatedSec: estimateOf('c-deuran'),
    finisherCount: 412,
    weeklyRunnerCount: 37,
  },
  {
    id: 'c-beomeo',
    name: '범어공원 언덕 루프',
    distanceM: lengthOf('c-beomeo'),
    tags: ['오르막'],
    displayRoute: route('c-beomeo'),
    myBestSec: null,
    leaderSec: 861,
    estimatedSec: estimateOf('c-beomeo'),
    finisherCount: 236,
    weeklyRunnerCount: 21,
  },
  {
    id: 'c-sincheon',
    name: '신천 강변 왕복',
    distanceM: lengthOf('c-sincheon'),
    tags: ['평지', '강변'],
    displayRoute: route('c-sincheon'),
    myBestSec: 1480,
    leaderSec: 1122,
    estimatedSec: estimateOf('c-sincheon'),
    finisherCount: 2051,
    weeklyRunnerCount: 215,
  },
  {
    id: 'c-dusan',
    name: '두산오거리 야간 3K',
    distanceM: lengthOf('c-dusan'),
    tags: ['야간 밝음', '초보 추천'],
    displayRoute: route('c-dusan'),
    myBestSec: null,
    leaderSec: 714,
    estimatedSec: estimateOf('c-dusan'),
    finisherCount: 96,
    weeklyRunnerCount: 12,
  },
  {
    id: 'c-stadium',
    name: '대구스타디움 루프',
    distanceM: 4800,
    tags: ['초보 추천'],
    displayRoute: loopRoute({ latitude: 35.8297, longitude: 128.6895 }, 380, 380, 36, 0.04, 0.6),
    myBestSec: null,
    leaderSec: 1016,
    estimatedSec: 1680,
    finisherCount: 688,
    weeklyRunnerCount: 54,
  },
];

const DELAY_MS = 600;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockCourseRepository(scenario: ExploreScenario): CourseRepository {
  return {
    async getNearby({ center, radiusM }: NearbyCourseQuery): Promise<CourseSummary[]> {
      if (scenario === 'loading') return new Promise(() => {});
      await wait(DELAY_MS);
      if (scenario === 'error') throw new CourseRepositoryError('network', '네트워크에 연결할 수 없어요');
      if (scenario === 'empty') return [];
      return MOCK_COURSES.map((c) => ({ ...c, startDistanceM: Math.round(distanceM(center, c.displayRoute[0])) }))
        .filter((c) => c.startDistanceM <= radiusM)
        .sort((a, b) => a.startDistanceM - b.startDistanceM);
    },
  };
}

/** 위치 권한이 없을 때 지도 기본 위치 */
export const DEFAULT_REGION_CENTER: GeoPoint = { latitude: 35.8274, longitude: 128.618 };
