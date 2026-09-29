import { apiRequest, ApiRequestError } from '@/shared/api/http';

import type { LiveMemberStatus, LiveMode, LiveRoom, LiveRoomStatus } from '../types';
import { toLiveResult, type ResultDto } from './liveDto';
import { LiveRoomError, type LiveRoomRepository } from './liveRoomRepository';

// 45장 Together REST (backend LiveRoomController).
// 방은 초대 링크(share_code)로만 들어온다: 링크 → 방 보기(INVITED) → 참가 → 준비 → 서버가 출발 시각을 정한다.
// 달리는 중 실시간 상태는 46장 WebSocket(httpLiveChannel), 결과는 서버가 확정한 값(GET /result)을 쓴다.

type RoomDto = {
  id: number;
  mode: LiveMode;
  targetDistanceM: number | null;
  targetSeconds: number | null;
  course: { id: number; name: string } | null;
  scheduledAt: string | null;
  status: LiveRoomStatus;
  startsAt: string | null;
  members: { userId: number; name: string; status: LiveMemberStatus; isHost: boolean; isMe: boolean }[];
  serverTime: string;
};

// 서버 시각을 이 기기 시계로 옮긴다 (대기실 카운트다운이 기기 시계로 돈다)
function toRoom(r: RoomDto): LiveRoom {
  const skew = Date.now() - Date.parse(r.serverTime);
  return {
    id: String(r.id),
    mode: r.mode,
    targetDistanceM: r.targetDistanceM,
    targetSeconds: r.targetSeconds,
    course: r.course ? { id: String(r.course.id), name: r.course.name } : null,
    scheduledAt: r.scheduledAt ? Date.parse(r.scheduledAt) + skew : null,
    status: r.status,
    startsAt: r.startsAt ? Date.parse(r.startsAt) + skew : null,
    members: r.members.map((m) => ({ userId: String(m.userId), name: m.name, status: m.status, isHost: m.isHost, isMe: m.isMe })),
  };
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiRequestError && e.code !== 'NETWORK' && (e.status === 404 || e.status === 403 || e.status === 409)) {
      throw new LiveRoomError('notFound', e.message);
    }
    throw new LiveRoomError('network', e instanceof Error ? e.message : '서버에 연결하지 못했어요');
  }
}

const path = (roomId: string) => `/api/v1/live-runs/${encodeURIComponent(roomId)}`;

export function createHttpLiveRoomRepository(): LiveRoomRepository {
  const repo: LiveRoomRepository = {
    listUpcoming: () => call(async () => (await apiRequest<RoomDto[]>('/api/v1/live-runs')).map(toRoom)),
    // 끝난 방 목록 API는 아직 없다 (결과는 방 id로 연다)
    listRecent: async () => [],
    // 친구 기능(WBS 8) 전: 방을 만든 뒤 초대 링크로 부른다
    listFriends: async () => [],
    create: (input) =>
      call(async () =>
        toRoom(
          await apiRequest<RoomDto>('/api/v1/live-runs', {
            method: 'POST',
            body: {
              mode: input.mode,
              targetDistanceM: input.targetDistanceM,
              targetSeconds: input.targetSeconds,
              courseId: input.courseId != null && /^\d+$/.test(input.courseId) ? Number(input.courseId) : null,
              scheduledAt: input.scheduledAt != null ? new Date(input.scheduledAt).toISOString() : null,
            },
          }),
        ),
      ),
    get: (roomId, inviteCode) => call(async () => toRoom(await apiRequest<RoomDto>(path(roomId), { query: inviteCode ? { inviteCode } : undefined }))),
    join: (roomId, inviteCode) =>
      call(async () => toRoom(await apiRequest<RoomDto>(`${path(roomId)}/join`, { method: 'POST', body: { inviteCode: inviteCode ?? '' } }))),
    setReady: (roomId, ready) => call(async () => toRoom(await apiRequest<RoomDto>(`${path(roomId)}/ready`, { method: 'POST', body: { ready } }))),
    leave: (roomId) => call(() => apiRequest<void>(`${path(roomId)}/leave`, { method: 'POST' })),
    cancel: (roomId) => call(() => apiRequest<void>(`${path(roomId)}/cancel`, { method: 'POST' })),
    getResult: (roomId) => call(async () => toLiveResult(await apiRequest<ResultDto>(`${path(roomId)}/result`))),
    // 같은 조건으로 새 방. 사람은 새 초대 링크로 다시 부른다
    rematch: async (roomId) => {
      const prev = await repo.get(roomId);
      return repo.create({
        mode: prev.mode,
        targetDistanceM: prev.targetDistanceM,
        targetSeconds: prev.targetSeconds,
        courseId: prev.course?.id ?? null,
        scheduledAt: null,
        inviteeIds: [],
      });
    },
  };
  return repo;
}
