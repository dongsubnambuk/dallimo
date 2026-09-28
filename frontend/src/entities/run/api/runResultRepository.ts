import type { RunHistoryPage } from '../history';
import type { RunResult } from '../result';

// 119장 repository 경계. 끝난 러닝을 기기에 저장하고(RUN-006 Local First), 서버 결과·검증 상태를 받아온다.
// 실제 구현: 기기 저장은 SQLite local_run, 서버는 POST /runs/{id}/finish · GET /runs/{id} (42.4장).
export type NewRunResult = Pick<RunResult, 'clientRunUuid' | 'mode' | 'startedAt' | 'distanceM' | 'activeSec' | 'avgPaceSec' | 'splits' | 'path' | 'course' | 'target'>;

export interface RunResultRepository {
  // synced: 종료 때 서버까지 올렸는지. false면 기기에만 있다(local-only).
  saveFinished(input: NewRunResult, synced: boolean): Promise<string>;
  get(id: string): Promise<RunResult>;
  // 내 러닝 히스토리. 최근 기록부터 cursor로 이어 받는다 (GET /runs?cursor=&size=, MY-003)
  list(cursor: string | null, size: number): Promise<RunHistoryPage>;
}

export class RunResultNotFoundError extends Error {}
