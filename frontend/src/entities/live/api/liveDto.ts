import type { LiveMemberState, LiveMemberStatus, LiveMode, LiveResult } from '../types';

// 서버 Live 값 → 앱 모델 (backend LiveRaceService). 방 결과 REST와 WebSocket ROOM_FINISHED가 같은 모양이다.

export type MemberViewDto = {
  userId: number;
  name: string;
  status: LiveMemberStatus;
  distanceM: number;
  elapsedSec: number;
  paceSec: number | null;
  finishSec: number | null;
};

export type ResultDto = {
  roomId: number;
  mode: LiveMode;
  targetDistanceM: number | null;
  targetSeconds: number | null;
  finishedAt: string | null;
  entries: { userId: number; name: string; isMe: boolean; rank: number | null; status: 'FINISHED' | 'DNF'; timeSec: number | null; distanceM: number }[];
  myRunId: number | null;
};

// 서버 기록 id는 앱 안에서 srv-{runId}로 쓴다 (httpRunResultRepository)
export const serverRunResultId = (runId: number | null) => (runId != null ? `srv-${runId}` : null);

export function toMemberStates(list: MemberViewDto[], myUserId: string | null): LiveMemberState[] {
  return list.map((m) => ({
    userId: String(m.userId),
    name: m.name,
    isMe: String(m.userId) === myUserId,
    status: m.status,
    distanceM: m.distanceM,
    elapsedSec: m.elapsedSec,
    paceSec: m.paceSec,
    finishSec: m.finishSec,
  }));
}

// myUserId를 주면 isMe를 다시 정한다 (방 전체에 보내는 ROOM_FINISHED에는 받는 사람이 없다)
export function toLiveResult(r: ResultDto, myUserId?: string | null, myRunId?: string | null): LiveResult {
  return {
    roomId: String(r.roomId),
    mode: r.mode,
    targetDistanceM: r.targetDistanceM,
    targetSeconds: r.targetSeconds,
    finishedAt: r.finishedAt ? Date.parse(r.finishedAt) : Date.now(),
    entries: r.entries.map((e) => ({
      userId: String(e.userId),
      name: e.name,
      isMe: myUserId !== undefined ? String(e.userId) === myUserId : e.isMe,
      rank: e.rank,
      status: e.status,
      timeSec: e.timeSec,
      distanceM: e.distanceM,
    })),
    myRunId: myRunId ?? serverRunResultId(r.myRunId),
  };
}
