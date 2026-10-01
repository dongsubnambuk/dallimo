import { toRankingEntry, type RankingEntryDto } from '@/entities/ranking/api/httpRankingRepository';
import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import type { CourseDetail, CourseDifficulty, CourseReview, CourseSourceInfo, CourseStatus, CourseSummary, Level, MyCourse, MyCourseKind, ReviewScore } from '../types';
import { CourseRepositoryError, type CourseRepository } from './courseRepository';

// 43장 Course API 실제 클라이언트 (backend/dallimo-server /api/v1/courses).
// 러닝 환경 · 평점은 완주자 평가(REV-001)를 서버가 모은 값이다. 모르는 값은 null로 넘기고 화면이 "정보 없음"으로 보여준다.

type LatLng = [number, number];

export type CourseSummaryDto = {
  id: number;
  name: string;
  // 내 코스(만든 코스)에는 HIDDEN · BLOCKED도 온다
  status: MyCourse['status'];
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
  region: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  difficulty?: CourseDifficulty | null;
  recommendedTime?: string | null;
  // USER · OSM · DURUNUBI · GPX (앱 목록은 아직 쓰지 않는다)
  source?: string;
};

export type ReviewDto = {
  id: number;
  nickname: string;
  isMine: boolean;
  rating: number;
  surfaceScore: ReviewScore | null;
  signalScore: ReviewScore | null;
  nightScore: ReviewScore | null;
  crowdScore: ReviewScore | null;
  hasToilet: boolean | null;
  hasWater: boolean | null;
  content: string | null;
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
  // friendBest: 친구 최고 기록 (친구가 없거나 기록이 없으면 null)
  competition: {
    leaderSec: number | null;
    myWeeklyRank: number | null;
    weeklyTop: RankingEntryDto[];
    myEntry: RankingEntryDto | null;
    friendBest: { userId: number; name: string; timeSec: number; recordId: number } | null;
  };
  bookmarked: boolean;
  region: string | null;
  recommendedTime: string | null;
  environment: { signals: Level | null; nightLight: Level | null; crowd: Level | null; surface: 'ROUGH' | 'NORMAL' | 'SMOOTH' | null; toilet: boolean | null; water: boolean | null };
  rating: { avg: number | null; count: number; canReview: boolean; mine: ReviewDto | null };
  // 추천 코스 출처 (사용자 코스는 null)
  source: CourseSourceInfo | null;
};

// 노면 점수 평균을 말로 (1 울퉁불퉁 ~ 3 고름)
const SURFACE: Record<'ROUGH' | 'NORMAL' | 'SMOOTH', string> = { ROUGH: '울퉁불퉁한 곳이 있어요', NORMAL: '보통', SMOOTH: '고른 편' };

export const toReview = (r: ReviewDto): CourseReview => ({
  id: String(r.id),
  nickname: r.nickname,
  isMine: r.isMine,
  rating: r.rating,
  surfaceScore: r.surfaceScore,
  signalScore: r.signalScore,
  nightScore: r.nightScore,
  crowdScore: r.crowdScore,
  hasToilet: r.hasToilet,
  hasWater: r.hasWater,
  content: r.content,
  createdAt: Date.parse(r.createdAt),
});

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
    region: c.region,
    ratingAvg: c.ratingAvg,
    reviewCount: c.reviewCount,
    difficulty: c.difficulty ?? null,
    recommendedTime: c.recommendedTime ?? null,
  };
}

export function toCourseDetail(c: CourseDetailDto): CourseDetail {
  return {
    id: String(c.id),
    name: c.name,
    status: c.status,
    description: c.description,
    region: c.region,
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
    recommendedTime: c.recommendedTime,
    environment: {
      signals: c.environment.signals,
      nightLight: c.environment.nightLight,
      crowd: c.environment.crowd,
      surface: c.environment.surface ? SURFACE[c.environment.surface] : null,
      toilets: c.environment.toilet,
      waterFountains: c.environment.water,
    },
    rating: { avg: c.rating.avg, count: c.rating.count, canReview: c.rating.canReview, mine: c.rating.mine ? toReview(c.rating.mine) : null },
    source: c.source ?? null,
    // 서버 기록은 검증을 통과한 공식 기록(course_record)만 센다
    myRecord: c.myRecord ? { bestSec: c.myRecord.bestSec, bestVerification: 'verified', lastSec: c.myRecord.lastSec, finishCount: c.myRecord.finishCount } : null,
    // 코스 1위는 전체 기간, 순위는 이번 주(한국 시간 월요일 0시부터). 친구 기록은 친구 기능(WBS 8) 뒤에 채운다
    competition: {
      leaderSec: c.competition.leaderSec,
      myWeeklyRank: c.competition.myWeeklyRank,
      friendBest: c.competition.friendBest
        ? { name: c.competition.friendBest.name, timeSec: c.competition.friendBest.timeSec, recordId: String(c.competition.friendBest.recordId) }
        : null,
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

    search: (query) =>
      call(async () => {
        const page = await apiRequest<CursorPage<CourseSummaryDto>>('/api/v1/courses/search', { query: { query: query.trim(), size: '30' } });
        return page.items.map(toSummary);
      }),

    getReviews: (courseId, cursor) =>
      call(async () => {
        const page = await apiRequest<CursorPage<ReviewDto>>(`/api/v1/courses/${encodeURIComponent(courseId)}/reviews`, {
          query: { size: '20', ...(cursor ? { cursor } : {}) },
        });
        return { items: page.items.map(toReview), nextCursor: page.nextCursor };
      }),

    writeReview: (courseId, input) =>
      call(async () => toReview(await apiRequest<ReviewDto>(`/api/v1/courses/${encodeURIComponent(courseId)}/reviews`, { method: 'POST', body: input }))),

    deleteReview: (courseId) => call(() => apiRequest<void>(`/api/v1/courses/${encodeURIComponent(courseId)}/reviews/me`, { method: 'DELETE' })),

    report: (courseId, reason, content) =>
      call(() => apiRequest<void>(`/api/v1/courses/${encodeURIComponent(courseId)}/reports`, { method: 'POST', body: { reason, content } })),

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
