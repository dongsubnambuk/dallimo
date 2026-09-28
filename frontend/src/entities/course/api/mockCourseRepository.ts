import type { CourseDetail, CourseRankingEntry, CourseStatus, CourseSummary, MyCourse, NearbyCourseQuery, RecordVerification } from '@/entities/course/types';
import { distanceM, loopRoute, type GeoPoint } from '@/shared/geo';

import { CourseRepositoryError, type CourseRepository } from './courseRepository';
import { MOCK_COURSE_ROUTES } from './mockCourseRoutes';

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

// 상세 전용 예시 값 (CRS-101~104). 수치는 코스 길이·고도와 어긋나지 않게 잡았다.
type MockDetailExtra = Pick<CourseDetail, 'description' | 'region' | 'creatorName' | 'difficulty' | 'recommendedTime' | 'environment'> & {
  lastSec: number | null;
  finishCount: number;
  bestVerification: RecordVerification;
  myWeeklyRank: number | null;
  friendBest: { name: string; timeSec: number } | null;
  // 이번 주 1~3위 (이름, 기록 초)
  top: [string, number][];
};

const MOCK_DETAIL: Record<string, MockDetailExtra | undefined> = {
  'c-suseongmot': {
    description: '수성못을 한 바퀴 도는 평지 루프. 호숫가 산책로라 신호가 없고, 밤에도 조명이 밝아 퇴근 후 달리기 좋아요.',
    region: '대구 수성구',
    creatorName: '수성런',
    difficulty: 'EASY',
    recommendedTime: '새벽 · 저녁',
    environment: { signals: 'LOW', nightLight: 'HIGH', crowd: 'MEDIUM', surface: '우레탄 산책로', toilets: 2, waterFountains: 1 },
    lastSec: 648,
    finishCount: 14,
    bestVerification: 'verified',
    myWeeklyRank: 18,
    friendBest: { name: '민수', timeSec: 598 },
    top: [['지수', 468], ['러너 박', 489], ['하늘', 502]],
  },
  'c-deuran': {
    description: '수성못 북쪽에서 들안로를 따라 올라갔다 돌아오는 왕복 코스. 인도가 넓고 오르막이 거의 없어요.',
    region: '대구 수성구',
    creatorName: '들안길러너',
    difficulty: 'EASY',
    recommendedTime: '아침',
    environment: { signals: 'MEDIUM', nightLight: 'HIGH', crowd: 'MEDIUM', surface: '보도블록', toilets: 0, waterFountains: 0 },
    lastSec: null,
    finishCount: 0,
    bestVerification: 'verified',
    myWeeklyRank: null,
    friendBest: null,
    top: [['도윤', 552], ['서연', 571], ['지훈', 590]],
  },
  'c-beomeo': {
    description: '범어공원 산책로를 도는 언덕 루프. 초반 오르막이 길어서 페이스 조절이 필요해요.',
    region: '대구 수성구',
    creatorName: '언덕조아',
    difficulty: 'HARD',
    recommendedTime: '오전',
    environment: { signals: 'LOW', nightLight: 'LOW', crowd: 'LOW', surface: '흙길 · 데크', toilets: 1, waterFountains: 1 },
    lastSec: null,
    finishCount: 0,
    bestVerification: 'verified',
    myWeeklyRank: null,
    friendBest: { name: '민수', timeSec: 1012 },
    top: [['트레일킴', 861], ['산바람', 902], ['지수', 944]],
  },
  'c-sincheon': {
    description: '신천 동쪽 강변을 따라 남쪽으로 내려갔다 돌아오는 왕복. 자전거 도로와 나뉘어 있어요.',
    region: '대구 수성구 · 중구',
    creatorName: '신천크루',
    difficulty: 'MODERATE',
    recommendedTime: '새벽 · 저녁',
    environment: { signals: 'LOW', nightLight: 'MEDIUM', crowd: 'HIGH', surface: '우레탄 · 아스팔트', toilets: 3, waterFountains: 2 },
    lastSec: 1512,
    finishCount: 6,
    bestVerification: 'pending',
    myWeeklyRank: 41,
    friendBest: { name: '하늘', timeSec: 1390 },
    top: [['러너 박', 1122], ['지수', 1168], ['신천왕', 1190]],
  },
  'c-dusan': {
    description: '두산오거리에서 들안로와 동대구로를 잇는 도심 블록 루프. 가로등이 많아 밤에도 밝아요.',
    region: '대구 수성구',
    creatorName: '야간러너',
    difficulty: 'EASY',
    recommendedTime: '밤',
    environment: { signals: 'HIGH', nightLight: 'HIGH', crowd: 'MEDIUM', surface: '보도블록', toilets: 1, waterFountains: 0 },
    lastSec: null,
    finishCount: 0,
    bestVerification: 'verified',
    myWeeklyRank: null,
    friendBest: null,
    top: [['야간러너', 714], ['서연', 760], ['도윤', 779]],
  },
};

const pace = (sec: number, m: number) => Math.round(sec / (m / 1000));

function toDetail(c: MockCourse, scenario: MockCourseScenario): CourseDetail {
  const x = MOCK_DETAIL[c.id];
  const routeData = MOCK_COURSE_ROUTES[c.id];
  const hasRecord = scenario !== 'noRecord' && c.myBestSec != null && x != null && x.lastSec != null;
  const top: CourseRankingEntry[] = (x?.top ?? []).map(([name, sec], i) => ({
    rank: i + 1,
    name,
    timeSec: sec,
    paceSecPerKm: pace(sec, c.distanceM),
    relation: x?.friendBest?.name === name ? 'friend' : 'normal',
  }));
  const myEntry: CourseRankingEntry | null =
    hasRecord && x.myWeeklyRank != null
      ? { rank: x.myWeeklyRank, name: '수성러너', timeSec: c.myBestSec!, paceSecPerKm: pace(c.myBestSec!, c.distanceM), relation: 'self', isPB: true }
      : null;
  return {
    id: c.id,
    name: c.name,
    description: x?.description ?? null,
    region: x?.region ?? '대구',
    creatorName: x?.creatorName ?? '달리모',
    distanceM: c.distanceM,
    estimatedSec: c.estimatedSec,
    difficulty: x?.difficulty ?? null,
    elevationGainM: routeData?.elevationGainM ?? null,
    tags: c.tags,
    route: c.displayRoute,
    elevationProfile: routeData ? routeData.profile.map(([distanceM, altitudeM]) => ({ distanceM, altitudeM })) : null,
    finisherCount: c.finisherCount,
    weeklyRunnerCount: c.weeklyRunnerCount,
    recommendedTime: x?.recommendedTime ?? null,
    environment: x?.environment ?? { signals: null, nightLight: null, crowd: null, surface: null, toilets: null, waterFountains: null },
    myRecord: hasRecord ? { bestSec: c.myBestSec!, bestVerification: x.bestVerification, lastSec: x.lastSec!, finishCount: x.finishCount } : null,
    competition:
      scenario === 'rankingUnavailable'
        ? null
        : { leaderSec: c.leaderSec, myWeeklyRank: hasRecord ? x.myWeeklyRank : null, friendBest: x?.friendBest ?? null, weeklyTop: top, myEntry },
    bookmarked: bookmarks.has(c.id),
    status: statusOf(c),
  };
}

// CRS-105 저장한 코스, 앱을 켜 둔 동안 등록한 코스 (mock)
const bookmarks = new Set<string>(['c-sincheon']);
const created = new Map<string, number>();

function statusOf(c: MockCourse): CourseStatus {
  if (created.has(c.id)) return 'NEW';
  return c.finisherCount >= 1000 ? 'POPULAR' : 'VERIFIED';
}

/** mock 코스 등록: 새 코스를 목록에 더한다. 실제로는 서버가 POST /courses에서 만든다. */
export function addMockCourse(summary: MockCourse, extra: Pick<CourseDetail, 'description' | 'creatorName' | 'recommendedTime'>) {
  MOCK_COURSES.push(summary);
  MOCK_DETAIL[summary.id] = {
    ...extra,
    region: '대구 수성구',
    difficulty: null,
    environment: { signals: null, nightLight: null, crowd: null, surface: null, toilets: null, waterFountains: null },
    lastSec: null,
    finishCount: 0,
    bestVerification: 'pending',
    myWeeklyRank: null,
    friendBest: null,
    top: [],
  };
  created.set(summary.id, Date.now());
}

const DELAY_MS = 600;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 개발 빌드 QA용 강제 상태. 화면별 scenario 파서가 이 값으로 바꿔 넘긴다 (74장 상태 매트릭스).
export type MockCourseScenario = 'normal' | 'loading' | 'error' | 'empty' | 'hidden' | 'noRecord' | 'rankingUnavailable';

export function createMockCourseRepository(scenario: MockCourseScenario): CourseRepository {
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
    async getDetail(id: string): Promise<CourseDetail> {
      if (scenario === 'loading') return new Promise(() => {});
      await wait(DELAY_MS);
      if (scenario === 'error') throw new CourseRepositoryError('network', '네트워크에 연결할 수 없어요');
      if (scenario === 'hidden') throw new CourseRepositoryError('hidden', '비공개 또는 숨김 처리된 코스');
      const c = MOCK_COURSES.find((m) => m.id === id);
      if (!c) throw new CourseRepositoryError('notFound', '코스를 찾을 수 없어요');
      return toDetail(c, scenario);
    },
    async setBookmark(id, saved) {
      await wait(300);
      if (scenario === 'error') throw new CourseRepositoryError('network', '네트워크에 연결할 수 없어요');
      if (saved) bookmarks.add(id);
      else bookmarks.delete(id);
    },
    async getMine(kind): Promise<MyCourse[]> {
      if (scenario === 'loading') return new Promise(() => {});
      await wait(DELAY_MS);
      if (scenario === 'error') throw new CourseRepositoryError('network', '네트워크에 연결할 수 없어요');
      if (scenario === 'empty') return [];
      const pick = MOCK_COURSES.filter((c) =>
        kind === 'created' ? created.has(c.id) : kind === 'saved' ? bookmarks.has(c.id) : c.myBestSec != null && (MOCK_DETAIL[c.id]?.finishCount ?? 0) > 0,
      );
      return pick
        .map((c) => ({
          ...c,
          startDistanceM: null,
          createdAt: created.get(c.id) ?? null,
          finishCount: MOCK_DETAIL[c.id]?.finishCount ?? null,
          status: statusOf(c),
        }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
  };
}

/** 위치 권한이 없을 때 지도 기본 위치 */
export const DEFAULT_REGION_CENTER: GeoPoint = { latitude: 35.8274, longitude: 128.618 };
