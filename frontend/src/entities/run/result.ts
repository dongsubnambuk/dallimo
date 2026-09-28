import type { GeoPoint } from '@/shared/geo';

import type { RunMode, RunSplit } from './types';

// SCR-R04 러닝 결과 (RST-001~004). GET /api/v1/runs/{runId}(42.4장 Finish 응답 + 검증 결과)의 앱 쪽 모델.
// 최종 필드는 OpenAPI 확정 시 맞춘다.

// 기기 → 서버 동기화 상태 (SCREEN-SPECS Result: local-only, syncing)
export type RunSyncState = 'localOnly' | 'syncing' | 'synced';
// 6.3장 VerificationStatus. 코스 없는 러닝은 NONE.
export type RunVerification = 'none' | 'pending' | 'verified' | 'unverified' | 'rejected';

export type RunResult = {
  id: string;
  // 42.1장 clientRunUuid (기기 저장 키, POST /runs 멱등 키)
  clientRunUuid: string;
  mode: RunMode;
  // 시작 · 종료 시각(epoch ms). API는 ISO-8601 offset 포함 값 (7.4장). 히스토리 정렬 기준은 started_at (6.4장)
  startedAt: number;
  finishedAt: number;
  distanceM: number;
  activeSec: number;
  // sec/km 정수 (7.4장)
  avgPaceSec: number | null;
  splits: RunSplit[];
  // 지도 표시용 실제 경로
  path: GeoPoint[];
  course: {
    id: string;
    name: string;
    // 코스 끝에 닿은 시점까지 기록(초). 완주하지 못했으면 null.
    timeSec: number | null;
  } | null;
  target: { sec: number; label: string } | null;
  sync: RunSyncState;
  verification: RunVerification;
  // UNVERIFIED / REJECTED 사유 (26.4장 check 결과를 사용자 말로)
  verificationReason: string | null;
  // RST-002 PB 판정. 서버가 VERIFIED 기록 기준으로 판정한다. 판정 전이면 null.
  pb: { previousSec: number | null; improved: boolean } | null;
  // RST-003 코스 주간 순위 변화. 검증 완료 뒤에만 있다.
  weeklyRank: { before: number | null; after: number } | null;
  // RST-004 같은 코스 친구 최고 기록
  friendBest: { name: string; timeSec: number } | null;
};
