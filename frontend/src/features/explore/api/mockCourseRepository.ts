import type { CourseSummary, NearbyCourseQuery } from '@/entities/course/types';
import { distanceM, legRoute, loopRoute, type GeoPoint } from '@/shared/geo';

import { CourseRepositoryError, type CourseRepository } from './courseRepository';
import type { ExploreScenario } from './scenario';

// 실제 API 전까지 쓰는 예시 데이터. 대구 수성못 주변 (명세서 91장 예시 지역).
type MockCourse = Omit<CourseSummary, 'startDistanceM'>;

const MOCK_COURSES: MockCourse[] = [
  {
    id: 'c-suseongmot',
    name: '수성못 둘레길',
    distanceM: 2300,
    tags: ['평지', '야간 밝음'],
    displayRoute: loopRoute({ latitude: 35.8286, longitude: 128.6176 }, 420, 300, 48, 0.08),
    myBestSec: 702,
    estimatedSec: 840,
    finisherCount: 1284,
    weeklyRunnerCount: 128,
  },
  {
    id: 'c-deuran',
    name: '수성못–들안길 왕복',
    distanceM: 5100,
    tags: ['신호 적음'],
    // 수성못 남동쪽에서 들안길 방향으로 갔다가 돌아오는 굽은 왕복
    displayRoute: legRoute({ latitude: 35.8262, longitude: 128.6214 }, [
      [60, -90], [80, -110], [90, -90], [70, -120], [40, -130], [10, -140], [-20, -120], [10, -100], [-40, 20], [-70, 110], [-90, 130], [-60, 140], [-40, 120], [-50, 100],
    ]),
    myBestSec: null,
    estimatedSec: 1860,
    finisherCount: 412,
    weeklyRunnerCount: 37,
  },
  {
    id: 'c-beomeo',
    name: '범어공원 언덕 루프',
    distanceM: 3400,
    tags: ['오르막'],
    displayRoute: loopRoute({ latitude: 35.8398, longitude: 128.6262 }, 260, 330, 32, 0.12, 1.2),
    myBestSec: null,
    estimatedSec: 1320,
    finisherCount: 236,
    weeklyRunnerCount: 21,
  },
  {
    id: 'c-sincheon',
    name: '신천 강변 5K',
    distanceM: 5000,
    tags: ['평지', '강변'],
    displayRoute: legRoute({ latitude: 35.8342, longitude: 128.6008 }, [
      [-60, 220], [-40, 300], [-30, 320], [-50, 280], [-20, 240],
    ]),
    myBestSec: 1611,
    estimatedSec: 1740,
    finisherCount: 2051,
    weeklyRunnerCount: 215,
  },
  {
    id: 'c-dusan',
    name: '두산오거리 야간 3K',
    distanceM: 3000,
    tags: ['야간 밝음', '초보 추천'],
    displayRoute: loopRoute({ latitude: 35.8245, longitude: 128.6105 }, 230, 170, 28, 0.06, 2),
    myBestSec: null,
    estimatedSec: 1080,
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
export const DEFAULT_REGION_CENTER: GeoPoint = { latitude: 35.8286, longitude: 128.6176 };
