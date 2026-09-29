import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import { toRunSummary, type RunSummary } from '../history';
import type { RunResult, RunVerification } from '../result';
import type { RunMode, RunSplit } from '../types';
import { RunResultNotFoundError, type NewRunResult, type RunResultRepository } from './runResultRepository';

// 서버 주소가 있을 때의 러닝 기록 저장소.
// 이번 실행에서 끝낸 러닝은 기기 값으로 바로 보여주고(RUN-006 Local First), 지난 기록은 서버 GET /api/v1/runs · /runs/{id}에서 읽는다.
// 서버 기록 id는 앱 안에서 srv-{runId}로 쓴다.

type ServerSummary = {
  runId: number;
  clientRunUuid: string;
  mode: RunMode;
  status: string;
  courseId: number | null;
  startedAt: string;
  endedAt: string | null;
  distanceM: number;
  elapsedSeconds: number;
  avgPaceSecPerKm: number | null;
  verificationStatus: string;
};
type ServerDetail = { summary: ServerSummary; splits: RunSplit[]; path: [number, number][] };

const SERVER_PREFIX = 'srv-';

type Local = { id: string; input: NewRunResult; finishedAt: number; synced: boolean };

function toVerification(status: string): RunVerification {
  const v = status.toLowerCase();
  return v === 'pending' || v === 'verified' || v === 'unverified' || v === 'rejected' ? v : 'none';
}

// 코스 이름은 서버 코스 API가 생기면 채운다. 지금 서버 기록에는 코스 정보를 보여주지 않는다.
function fromServer(s: ServerSummary, splits: RunSplit[], path: [number, number][]): RunResult {
  const startedAt = Date.parse(s.startedAt);
  return {
    id: `${SERVER_PREFIX}${s.runId}`,
    clientRunUuid: s.clientRunUuid,
    mode: s.mode,
    startedAt,
    finishedAt: s.endedAt ? Date.parse(s.endedAt) : startedAt + s.elapsedSeconds * 1000,
    distanceM: s.distanceM,
    activeSec: s.elapsedSeconds,
    avgPaceSec: s.avgPaceSecPerKm,
    splits,
    path: path.map(([latitude, longitude]) => ({ latitude, longitude })),
    course: null,
    target: null,
    sync: 'synced',
    verification: toVerification(s.verificationStatus),
    verificationReason: null,
    pb: null,
    weeklyRank: null,
    friendBest: null,
  };
}

export function createHttpRunResultRepository(): RunResultRepository {
  // 이번 실행에서 끝낸 러닝 (앱을 다시 켜면 서버에 올라간 기록만 남는다)
  const local = new Map<string, Local>();
  let nextId = 1;

  const localResult = (l: Local): RunResult => ({
    id: l.id,
    ...l.input,
    finishedAt: l.finishedAt,
    sync: l.synced ? 'synced' : 'localOnly',
    // 검증은 서버가 한다. 올라가기 전에는 판정 전이다
    verification: l.input.course ? 'pending' : 'none',
    verificationReason: null,
    pb: null,
    weeklyRank: null,
    friendBest: null,
  });

  return {
    async saveFinished(input, synced) {
      const id = `run-${nextId++}`;
      local.set(id, { id, input, finishedAt: Date.now(), synced });
      return id;
    },

    async markSynced(clientRunUuid) {
      for (const l of local.values()) if (l.input.clientRunUuid === clientRunUuid) l.synced = true;
    },

    async get(id) {
      const l = local.get(id);
      if (l) return localResult(l);
      if (!id.startsWith(SERVER_PREFIX)) throw new RunResultNotFoundError(id);
      try {
        const d = await apiRequest<ServerDetail>(`/api/v1/runs/${encodeURIComponent(id.slice(SERVER_PREFIX.length))}`);
        return fromServer(d.summary, d.splits, d.path);
      } catch (e) {
        if (e instanceof ApiRequestError && (e.code === 'RUN_NOT_FOUND' || e.code === 'RESOURCE_FORBIDDEN')) throw new RunResultNotFoundError(id);
        throw e;
      }
    },

    async list(cursor, size) {
      const page = await apiRequest<CursorPage<ServerSummary>>('/api/v1/runs', {
        query: { size: String(Math.min(50, size)), ...(cursor ? { cursor } : {}) },
      });
      // 이번 실행에서 끝낸 기록은 첫 페이지에 모두 기기 값(코스 이름 · 경로 포함)으로 보여준다.
      // 서버에 아직 없는 기록(기기에만 있음 · 올리는 중)도 여기에 들어간다. 다음 페이지에서는 같은 기록을 빼서 두 번 나오지 않게 한다.
      const localUuids = new Set([...local.values()].map((l) => l.input.clientRunUuid));
      const items: RunSummary[] = page.items.filter((s) => !localUuids.has(s.clientRunUuid)).map((s) => toRunSummary(fromServer(s, [], [])));
      if (!cursor) items.push(...[...local.values()].map((l) => toRunSummary(localResult(l))));
      items.sort((a, b) => b.finishedAt - a.finishedAt);
      return { items, nextCursor: page.nextCursor };
    },
  };
}
