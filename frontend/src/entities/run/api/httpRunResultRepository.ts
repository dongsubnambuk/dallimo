import { apiRequest, ApiRequestError } from '@/shared/api/http';
import type { CursorPage } from '@/shared/api/contract';

import { toRunSummary, type RunSummary } from '../history';
import type { RunResult, RunVerification } from '../result';
import type { RunMode, RunSplit } from '../types';
import { verificationReasonText } from '../verificationReason';
import { RunResultNotFoundError, type NewRunResult, type RunResultRepository } from './runResultRepository';

// 서버 주소가 있을 때의 러닝 기록 저장소.
// 이번 실행에서 끝낸 러닝은 기기 값으로 바로 보여주고(RUN-006 Local First), 지난 기록은 서버 GET /api/v1/runs · /runs/{id}에서 읽는다.
// 서버 기록 id는 앱 안에서 srv-{runId}로 쓴다.
// 코스 러닝은 서버가 커밋 뒤 완주를 검증한다(26장). 기기 기록도 서버에 올라간 뒤에는 서버 판정(인증 · 미인증 · 거부 · PB)을 받아 보여준다.

type ServerSummary = {
  runId: number;
  clientRunUuid: string;
  mode: RunMode;
  status: string;
  courseId: number | null;
  courseName: string | null;
  startedAt: string;
  endedAt: string | null;
  distanceM: number;
  elapsedSeconds: number;
  avgPaceSecPerKm: number | null;
  verificationStatus: string;
};
// 판정 전(PENDING)이면 status만 있다
type ServerVerification = {
  status: string;
  failureReason: string | null;
  recordSeconds: number | null;
  previousBestSec: number | null;
  personalBest: boolean | null;
  // 기록한 주의 주간 순위: 이 기록 전(그 주 기록이 없었으면 null) → 후 (RST-003)
  weeklyRankBefore: number | null;
  weeklyRankAfter: number | null;
};
type ServerDetail = { summary: ServerSummary; splits: RunSplit[]; path: [number, number][]; verification: ServerVerification | null };

const SERVER_PREFIX = 'srv-';

type Local = { id: string; input: NewRunResult; finishedAt: number; synced: boolean; serverRunId: string | null };

function toVerification(status: string): RunVerification {
  const v = status.toLowerCase();
  return v === 'pending' || v === 'verified' || v === 'unverified' || v === 'rejected' ? v : 'none';
}

// 서버 판정 → 결과 화면 값. 인증되면 공식 기록(출발점~도착점, 일시정지 제외)과 PB 판정
function verdict(v: ServerVerification | null, status: string) {
  const verification = toVerification(v?.status ?? status);
  return {
    verification,
    verificationReason: verification === 'unverified' || verification === 'rejected' ? verificationReasonText(v?.failureReason ?? null) : null,
    recordSec: verification === 'verified' ? (v?.recordSeconds ?? null) : null,
    pb: verification === 'verified' && v?.personalBest != null ? { previousSec: v.previousBestSec, improved: v.personalBest } : null,
    weeklyRank: verification === 'verified' && v?.weeklyRankAfter != null ? { before: v.weeklyRankBefore, after: v.weeklyRankAfter } : null,
  };
}

function fromServer(s: ServerSummary, splits: RunSplit[], path: [number, number][], v: ServerVerification | null): RunResult {
  const startedAt = Date.parse(s.startedAt);
  const { recordSec, ...judged } = verdict(v, s.verificationStatus);
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
    course: s.courseId != null ? { id: String(s.courseId), name: s.courseName ?? '', timeSec: recordSec } : null,
    target: null,
    sync: 'synced',
    ...judged,
    friendBest: null,
  };
}

const detailOf = (runId: string) => apiRequest<ServerDetail>(`/api/v1/runs/${encodeURIComponent(runId)}`);

export function createHttpRunResultRepository(): RunResultRepository {
  // 이번 실행에서 끝낸 러닝 (앱을 다시 켜면 서버에 올라간 기록만 남는다)
  const local = new Map<string, Local>();
  // 동기화가 알려 준 서버 Run id (clientRunUuid → runId). 종료 때는 동기화가 결과 저장보다 먼저 끝나므로 여기 먼저 남는다
  const serverIds = new Map<string, string>();
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

  // 서버에 올라간 코스 러닝은 서버 판정을 붙인다. 서버에 닿지 못하면 기기 값(검증 중)으로
  const withServerVerdict = async (l: Local): Promise<RunResult> => {
    const base = localResult(l);
    if (!l.input.course || !l.synced || !l.serverRunId) return base;
    const d = await detailOf(l.serverRunId).catch(() => null);
    if (!d) return base;
    const { recordSec, ...judged } = verdict(d.verification, d.summary.verificationStatus);
    return { ...base, ...judged, course: { ...l.input.course, timeSec: recordSec ?? l.input.course.timeSec } };
  };

  return {
    async saveFinished(input, synced) {
      const id = `run-${nextId++}`;
      local.set(id, { id, input, finishedAt: Date.now(), synced, serverRunId: serverIds.get(input.clientRunUuid) ?? null });
      return id;
    },

    async markSynced(clientRunUuid, serverRunId) {
      if (serverRunId) serverIds.set(clientRunUuid, serverRunId);
      for (const l of local.values()) {
        if (l.input.clientRunUuid !== clientRunUuid) continue;
        l.synced = true;
        l.serverRunId = serverRunId ?? l.serverRunId;
      }
    },

    async serverRunId(id) {
      if (id.startsWith(SERVER_PREFIX)) return id.slice(SERVER_PREFIX.length);
      const l = local.get(id);
      return l?.synced ? l.serverRunId : null;
    },

    async get(id) {
      const l = local.get(id);
      if (l) return withServerVerdict(l);
      if (!id.startsWith(SERVER_PREFIX)) throw new RunResultNotFoundError(id);
      try {
        const d = await detailOf(id.slice(SERVER_PREFIX.length));
        return fromServer(d.summary, d.splits, d.path, d.verification);
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
      const items: RunSummary[] = page.items.filter((s) => !localUuids.has(s.clientRunUuid)).map((s) => toRunSummary(fromServer(s, [], [], null)));
      if (!cursor) {
        // 서버에 올라간 기기 기록은 서버 판정 상태를 쓴다
        const judged = new Map(page.items.map((s) => [s.clientRunUuid, toVerification(s.verificationStatus)]));
        items.push(...[...local.values()].map((l) => toRunSummary({ ...localResult(l), verification: judged.get(l.input.clientRunUuid) ?? localResult(l).verification })));
      }
      items.sort((a, b) => b.finishedAt - a.finishedAt);
      return { items, nextCursor: page.nextCursor };
    },
  };
}
