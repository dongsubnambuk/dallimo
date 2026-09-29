import { toRankingEntry, type RankingEntryDto } from '@/entities/ranking/api/httpRankingRepository';
import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import type { CourseDetail, CourseDifficulty, CourseStatus, CourseSummary, MyCourse, MyCourseKind } from '../types';
import { CourseRepositoryError, type CourseRepository } from './courseRepository';

// 43장 Course API 실제 클라이언트 (backend/dallimo-server /api/v1/courses).
// 서버에 아직 없는 값(지역 · 추천 시간 · 러닝 환경 · 친구 기록)은 비워서 넘긴다. 화면은 모르는 값으로 처리한다.

type LatLng = [number, number];

export type CourseSummaryDto = {
  id: number;
  name: string;
  status: CourseStatus;
  distanceM: number;
  tags: string[];
  startDistanceM: number | null;
  displayRoute: LatLng[];
  estimatedSec: number;
  myBestSec: number | null;
  myFinishCount: number;
  leaderSec: number | null;
  finisherCount: number;
  weeklyRunnerCount: number;
  bookmarked: boolean;
  createdAt: string;
};

export type CourseDetailDto = {
  id: number;
  name: string;
  status: CourseStatus;
  description: string | null;
  creatorName: string;
  distanceM: number;
  estimatedSec: number;
  difficulty: CourseDifficulty | null;
  elevationGainM: number | null;
  tags: string[];
  route: LatLng[];
  elevationProfile: [number, number][] | null;
  finisherCount: number;
  weeklyRunnerCount: number;
  myRecord: { bestSec: number; lastSec: number; finishCount: number } | null;
  competition: { leaderSec: number | null; myWeeklyRank: number | null; weeklyTop: RankingEntryDto[]; myEntry: RankingEntryDto | null };
  bookmarked: boolean;
};

const toPoints = (route: LatLng[]) => route.map(([latitude, longitude]) => ({ latitude, longitude }));

function toSummary(c: CourseSummaryDto): CourseSummary {
  return {
    id: String(c.id),
    name: c.name,
    distanceM: c.distanceM,
    tags: c.tags,
    startDistanceM: c.startDistanceM,
    displayRoute: toPoints(c.displayRoute),
    myBestSec: c.myBestSec,
    leaderSec: c.leaderSec,
    estimatedSec: c.estimatedSec,
    finisherCount: c.finisherCount,
    weeklyRunnerCount: c.weeklyRunnerCount,
  };
}

export function toCourseDetail(c: CourseDetailDto): CourseDetail {
  return {
    id: String(c.id),
    name: c.name,
    status: c.status,
    description: c.description,
    region: null,
    creatorName: c.creatorName,
    distanceM: c.distanceM,
    estimatedSec: c.estimatedSec,
    difficulty: c.difficulty,
    elevationGainM: c.elevationGainM,
    tags: c.tags,
    route: toPoints(c.route),
    elevationProfile: c.elevationProfile ? c.elevationProfile.map(([distanceM, altitudeM]) => ({ distanceM, altitudeM })) : null,
    finisherCount: c.finisherCount,
    weeklyRunnerCount: c.weeklyRunnerCount,
    recommendedTime: null,
    environment: { signals: null, nightLight: null, crowd: null, surface: null, toilets: null, waterFountains: null },
    // 서버 기록은 검증을 통과한 공식 기록(course_record)만 센다
    myRecord: c.myRecord ? { bestSec: c.myRecord.bestSec, bestVerification: 'verified', lastSec: c.myRecord.lastSec, finishCount: c.myRecord.finishCount } : null,
    // 코스 1위는 전체 기간, 순위는 이번 주(한국 시간 월요일 0시부터). 친구 기록은 친구 기능(WBS 8) 뒤에 채운다
    competition: {
      leaderSec: c.competition.leaderSec,
      myWeeklyRank: c.competition.myWeeklyRank,
      friendBest: null,
      weeklyTop: c.competition.weeklyTop.map(toRankingEntry),
      myEntry: c.competition.myEntry ? toRankingEntry(c.competition.myEntry) : null,
    },
    bookmarked: c.bookmarked,
  };
}

// 서버 오류 → 화면이 구분하는 코스 오류
export function toCourseError(e: unknown): CourseRepositoryError {
  if (e instanceof CourseRepositoryError) return e;
  if (e instanceof ApiRequestError) {
    if (e.code === 'NETWORK') return new CourseRepositoryError('network', e.message);
    if (e.code === 'COURSE_NOT_FOUND' || e.status === 404) return new CourseRepositoryError('notFound', e.message);
    if (e.code === 'RESOURCE_FORBIDDEN') return new CourseRepositoryError('hidden', e.message);
    return new CourseRepositoryError('server', e.message);
  }
  return new CourseRepositoryError('server', '요청을 처리하지 못했어요');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toCourseError(e);
  }
}

// 탐색 지도에 한 번에 올리는 최대 코스 수 (서버 size 최대값)
const NEARBY_SIZE = 50;
const KIND = { created: 'CREATED', saved: 'SAVED', finished: 'FINISHED' } as const;

export function createHttpCourseRepository(): CourseRepository {
  return {
    getNearby: ({ center, radiusM }) =>
      call(async () => {
        const page = await apiRequest<CursorPage<CourseSummaryDto>>('/api/v1/courses/nearby', {
          query: { lat: String(center.latitude), lng: String(center.longitude), radius: String(Math.round(radiusM)), size: String(NEARBY_SIZE) },
        });
        return page.items.map(toSummary);
      }),

    getDetail: (id) => call(async () => toCourseDetail(await apiRequest<CourseDetailDto>(`/api/v1/courses/${encodeURIComponent(id)}`))),

    setBookmark: (id, saved) =>
      call(() => apiRequest<void>(`/api/v1/courses/${encodeURIComponent(id)}/bookmarks`, { method: saved ? 'POST' : 'DELETE' })),

    getMine: (kind: MyCourseKind) =>
      call(async () => {
        const list = await apiRequest<CourseSummaryDto[]>('/api/v1/users/me/courses', { query: { kind: KIND[kind] } });
        return list.map(
          (c): MyCourse => ({
            ...toSummary(c),
            createdAt: kind === 'created' ? Date.parse(c.createdAt) : null,
            finishCount: kind === 'finished' ? c.myFinishCount : null,
            status: c.status,
          }),
        );
      }),
  };
}
