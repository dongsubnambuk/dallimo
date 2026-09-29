import { apiRequest } from '@/shared/api/http';

import type { Challenge, ChallengeStatus } from '../types';
import type { ChallengeRepository } from './challengeRepository';

// 44장 Challenge API (backend ChallengeController)

export type ChallengeDto = {
  id: number;
  status: 'OPEN' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
  role: 'SENT' | 'RECEIVED';
  challenger: { userId: number; nickname: string };
  target: { userId: number; nickname: string };
  course: { id: number; name: string; distanceM: number };
  targetRecordId: number;
  targetSec: number;
  resultSec: number | null;
  runId: number | null;
  createdAt: string;
  finishedAt: string | null;
  targetBest: { recordId: number; timeSec: number };
};

export function toChallenge(c: ChallengeDto): Challenge {
  return {
    id: String(c.id),
    status: c.status.toLowerCase() as ChallengeStatus,
    role: c.role === 'SENT' ? 'sent' : 'received',
    challenger: { userId: String(c.challenger.userId), nickname: c.challenger.nickname },
    target: { userId: String(c.target.userId), nickname: c.target.nickname },
    course: { id: String(c.course.id), name: c.course.name, distanceM: c.course.distanceM },
    targetRecordId: String(c.targetRecordId),
    targetSec: c.targetSec,
    resultSec: c.resultSec,
    runResultId: c.runId != null ? `srv-${c.runId}` : null,
    createdAt: Date.parse(c.createdAt),
    finishedAt: c.finishedAt ? Date.parse(c.finishedAt) : null,
    targetBest: { recordId: String(c.targetBest.recordId), timeSec: c.targetBest.timeSec },
  };
}

const path = (id: string) => `/api/v1/challenges/${encodeURIComponent(id)}`;

export function createHttpChallengeRepository(): ChallengeRepository {
  return {
    create: async (targetRecordId) =>
      toChallenge(await apiRequest<ChallengeDto>('/api/v1/challenges', { method: 'POST', body: { targetCourseRecordId: Number(targetRecordId) } })),
    get: async (id) => toChallenge(await apiRequest<ChallengeDto>(path(id))),
    cancel: async (id) => toChallenge(await apiRequest<ChallengeDto>(`${path(id)}/cancel`, { method: 'POST' })),
    list: async (userId) =>
      (await apiRequest<ChallengeDto[]>('/api/v1/challenges', { query: userId ? { userId } : undefined })).map(toChallenge),
  };
}
