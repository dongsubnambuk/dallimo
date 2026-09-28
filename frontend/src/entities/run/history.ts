import type { GeoPoint } from '@/shared/geo';

import type { RunResult, RunSyncState, RunVerification } from './result';
import type { RunMode } from './types';

// SCR-M02 러닝 히스토리 한 줄 (MY-003). GET /api/v1/runs?cursor=&size= (1321행 cursor pagination)의 앱 쪽 모델.
// 최종 필드는 OpenAPI 확정 시 맞춘다.
export type RunSummary = {
  id: string;
  mode: RunMode;
  startedAt: number;
  finishedAt: number;
  distanceM: number;
  activeSec: number;
  avgPaceSec: number | null;
  course: { id: string; name: string; timeSec: number | null } | null;
  sync: RunSyncState;
  verification: RunVerification;
  // 이 기록으로 코스 PB를 세웠는지 (RST-002 판정 결과)
  pb: boolean;
  // 목록 썸네일용으로 줄인 경로
  preview: GeoPoint[];
};

export type RunHistoryPage = { items: RunSummary[]; nextCursor: string | null };

// 목록 썸네일은 작아서 점 40개면 모양이 충분하다 (CLAUDE.md 8항 단순화)
const PREVIEW_POINTS = 40;

export function toRunSummary(r: RunResult): RunSummary {
  const step = Math.max(1, Math.ceil(r.path.length / PREVIEW_POINTS));
  const preview = r.path.filter((_, i) => i % step === 0 || i === r.path.length - 1);
  return {
    id: r.id,
    mode: r.mode,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    distanceM: r.distanceM,
    activeSec: r.activeSec,
    avgPaceSec: r.avgPaceSec,
    course: r.course,
    sync: r.sync,
    verification: r.verification,
    pb: r.verification === 'verified' && !!r.pb?.improved,
    preview,
  };
}
