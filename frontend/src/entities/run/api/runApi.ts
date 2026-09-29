import type { ApiErrorCode } from '@/shared/api/contract';

import type { RunPoint, RunMode, RunStatus } from '../types';

// 42장 Run API 계약. 기록 동기화(features/run/sync)가 이 경계로 서버와 주고받는다.
// 백엔드 전까지는 mockRunApi가 서버 역할을 한다.

// 42.1장 POST /runs. clientRunUuid가 멱등 키 (201 생성 / 200 재요청)
export type CreateRunRequest = {
  clientRunUuid: string;
  mode: RunMode;
  courseId: string | null;
  challengeId: string | null;
  liveRoomId: string | null;
  startedAt: string;
};
export type CreateRunResponse = { runId: string; clientRunUuid: string; status: RunStatus; serverTime: string };

// 42.2장 POST /runs/{runId}/points. batchUuid가 멱등 키 (Idempotency-Key 헤더와 같은 값)
export type RunPointDto = {
  seq: number;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  accuracyM: number;
  speedMps?: number;
  recordedAt: string;
};
export type PointBatchRequest = { batchUuid: string; fromSeq: number; toSeq: number; points: RunPointDto[] };
export type PointBatchResponse = { batchUuid: string; accepted: boolean; lastAcceptedSeq: number };

// 42.4장 POST /runs/{runId}/finish. 서버에 저장된 마지막 seq가 lastSeq보다 작으면 FINISHING으로 답하고, 앱은 빠진 Batch를 보낸 뒤 다시 요청한다.
export type FinishRunRequest = { endedAt: string; lastSeq: number };
export type FinishRunResponse = {
  runId: string;
  status: RunStatus;
  distanceM: number;
  elapsedSeconds: number;
  avgPaceSecPerKm: number;
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
};

// 27장 오류 코드, 또는 서버에 닿지 못함(NETWORK: 연결 끊김 · 시간 초과)
export class RunApiError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';
  constructor(code: ApiErrorCode | 'NETWORK', message: string = code) {
    super(message);
    this.code = code;
  }
}

export interface RunApi {
  create(req: CreateRunRequest): Promise<CreateRunResponse>;
  uploadPoints(runId: string, req: PointBatchRequest): Promise<PointBatchResponse>;
  // 27.2장: pause는 RUNNING일 때만, resume은 PAUSED일 때만
  pause(runId: string): Promise<{ status: RunStatus; pausedAt: string }>;
  resume(runId: string): Promise<{ status: RunStatus; resumedAt: string }>;
  finish(runId: string, req: FinishRunRequest): Promise<FinishRunResponse>;
}

// 앱 RunPoint(10.1장) → API point. 이름과 단위 차이를 여기서만 맞춘다 (altitude → altitudeM, accuracy → accuracyM, speed → speedMps, epoch ms → ISO).
// qualityFlag는 서버가 다시 판정하므로 보내지 않는다 (42.3장 서버는 클라이언트 값을 원본으로 신뢰하지 않음).
export function toPointDto(p: RunPoint): RunPointDto {
  return {
    seq: p.seq,
    latitude: p.latitude,
    longitude: p.longitude,
    ...(p.altitude != null ? { altitudeM: p.altitude } : {}),
    accuracyM: p.accuracy,
    ...(p.speed != null ? { speedMps: p.speed } : {}),
    recordedAt: new Date(p.recordedAt).toISOString(),
  };
}
