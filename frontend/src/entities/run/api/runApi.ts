import type { RunPoint, RunMode, RunStatus } from '../types';

// 42장 Run API 계약. 실제 러닝 엔진(WBS 2 Running Core)이 이 경계로 서버와 주고받는다.
// 지금 mock 엔진은 서버를 부르지 않는다. 요청 · 응답 모양을 먼저 고정해 둔다.

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
