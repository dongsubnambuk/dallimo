// Together (TGT-001~012). 45장 /api/v1/live-runs 방 snapshot의 앱 쪽 모델.
// 6.3장 LiveRoomStatus, LiveMemberStatus. 상대의 GPS 좌표는 모델에 두지 않는다 (94장, 823행).

export type LiveMode = 'LIVE_RACE' | 'TIME_ATTACK' | 'TOGETHER';
export type LiveRoomStatus = 'WAITING' | 'READY' | 'RUNNING' | 'FINISHED' | 'CANCELED';
export type LiveMemberStatus = 'INVITED' | 'JOINED' | 'READY' | 'RUNNING' | 'FINISHED' | 'DNF' | 'DISCONNECTED';

export type LiveMember = {
  userId: string;
  name: string;
  status: LiveMemberStatus;
  isHost: boolean;
  isMe: boolean;
};

export type LiveRoom = {
  id: string;
  mode: LiveMode;
  // 45.1장: LIVE_RACE는 targetDistanceM 필수, TIME_ATTACK은 targetSeconds 필수
  targetDistanceM: number | null;
  targetSeconds: number | null;
  course: { id: string; name: string } | null;
  // 예약 시각(epoch ms). null이면 모두 준비되면 시작.
  scheduledAt: number | null;
  status: LiveRoomStatus;
  // 서버가 정한 출발 시각. 대기실 카운트다운에 쓴다.
  startsAt: number | null;
  members: LiveMember[];
};

// SCR-T01 최근 결과 한 줄
export type LiveRoomSummary = {
  id: string;
  mode: LiveMode;
  targetDistanceM: number | null;
  targetSeconds: number | null;
  finishedAt: number;
  myRank: number | null;
  memberCount: number;
  myFinished: boolean;
};

export type CreateRoomInput = {
  mode: LiveMode;
  targetDistanceM: number | null;
  targetSeconds: number | null;
  courseId: string | null;
  scheduledAt: number | null;
  inviteeIds: string[];
};

export type Friend = { userId: string; name: string };

// ---- Live (SCR-T04, 46장 WebSocket MEMBER_STATE) ----
// 실시간 경쟁에는 거리·경과·페이스·상태만 주고받는다 (30.2장). 위치 좌표는 없다.
export type LiveMemberState = {
  userId: string;
  name: string;
  isMe: boolean;
  status: LiveMemberStatus;
  distanceM: number;
  elapsedSec: number;
  paceSec: number | null;
  // 완주 기록(초). 완주 전이면 null.
  finishSec: number | null;
};

export type LiveResultEntry = {
  userId: string;
  name: string;
  isMe: boolean;
  // TOGETHER는 순위가 없다
  rank: number | null;
  status: 'FINISHED' | 'DNF';
  timeSec: number | null;
  distanceM: number;
};

// 45장 GET /live-runs/{roomId}/result. 결과 화면은 서버 finalization 값을 쓴다 (46.1장).
export type LiveResult = {
  roomId: string;
  mode: LiveMode;
  targetDistanceM: number | null;
  targetSeconds: number | null;
  finishedAt: number;
  entries: LiveResultEntry[];
  // 이 방에서 내 개인 Run 결과 id (개인 Run은 항상 생성, 45.1장)
  myRunId: string | null;
};
