import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { ApiErrorCode } from '@/shared/api/contract';

import type { RunStatus } from '../types';
import { RunApiError, type CreateRunResponse, type FinishRunResponse, type PointBatchResponse, type RunApi } from './runApi';

// 42장 Run API 실제 클라이언트 (backend/dallimo-server /api/v1/runs).
// 서버 id는 숫자라 앱 모델(string)로 바꿔 쓴다. 오류는 RunApiError로 바꿔 기록 동기화가 재시도 여부를 판단하게 한다.

type ServerId = { runId: number };

// 서버 코스 id는 숫자다. 아직 서버에 없는 mock 코스(c-suseongmot 등)는 코스 없이 올린다 (서버는 없는 코스면 COURSE_NOT_FOUND)
function toServerId(id: string | null): number | null {
  return id != null && /^\d+$/.test(id) ? Number(id) : null;
}

async function call<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  try {
    return await apiRequest<T>(path, { method: 'POST', body, headers });
  } catch (e) {
    if (e instanceof ApiRequestError) throw new RunApiError(e.code as ApiErrorCode | 'NETWORK', e.message);
    throw new RunApiError('NETWORK');
  }
}

export function createHttpRunApi(): RunApi {
  const base = (runId: string) => `/api/v1/runs/${encodeURIComponent(runId)}`;
  return {
    async create(req) {
      const res = await call<Omit<CreateRunResponse, 'runId'> & ServerId>('/api/v1/runs', {
        clientRunUuid: req.clientRunUuid,
        mode: req.mode,
        courseId: toServerId(req.courseId),
        challengeId: toServerId(req.challengeId),
        liveRoomId: toServerId(req.liveRoomId),
        startedAt: req.startedAt,
      });
      return { ...res, runId: String(res.runId) };
    },

    uploadPoints(runId, req) {
      // 7.3장: 재시도해도 같은 키 (batchUuid)
      return call<PointBatchResponse>(`${base(runId)}/points`, req, { 'Idempotency-Key': req.batchUuid });
    },

    async pause(runId) {
      const res = await call<{ status: RunStatus; at: string }>(`${base(runId)}/pause`, undefined);
      return { status: res.status, pausedAt: res.at };
    },

    async resume(runId) {
      const res = await call<{ status: RunStatus; at: string }>(`${base(runId)}/resume`, undefined);
      return { status: res.status, resumedAt: res.at };
    },

    async finish(runId, req) {
      const res = await call<Omit<FinishRunResponse, 'runId'> & ServerId>(`${base(runId)}/finish`, req);
      return { ...res, runId: String(res.runId) };
    },
  };
}
