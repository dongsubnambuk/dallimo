import type { LiveMemberState, LiveResult } from '../types';

// 46장 WebSocket 메시지 계약 중 화면에 필요한 부분.
// C→S RUN_STATE: 내 거리·경과·페이스·상태, CHEER: 응원. S→C MEMBER_STATE / MEMBER_CONNECTION / ROOM_FINISHED / CHEER.
// 실제 채널(httpLiveChannel)이 서버 필드로 바꿔 보낸다: elapsedSec → elapsedSeconds, paceSec → currentPaceSecPerKm,
// seq · sentAt은 채널이 붙인다. 서버 Run과 방은 POST /runs의 liveRoomId로 이어진다.
export type MyRunState = {
  distanceM: number;
  elapsedSec: number;
  paceSec: number | null;
  status: 'RUNNING' | 'FINISHED' | 'DNF';
  // 끝났을 때 기기에 저장한 개인 Run 결과 id
  runId?: string;
};

export type LiveEvent =
  | { type: 'MEMBER_STATE'; members: LiveMemberState[] }
  // 내 연결 상태. 끊겨도 개인 Run 기록은 계속된다 (32장 WebSocket 단절)
  | { type: 'CONNECTION'; connected: boolean }
  | { type: 'ROOM_FINISHED'; result: LiveResult }
  // 함께 달리기 응원. toMe: 나를 응원했는지 (방 전체 응원이면 true)
  | { type: 'CHEER'; fromUserId: string; fromName: string; toMe: boolean };

export interface LiveChannel {
  connect(onEvent: (e: LiveEvent) => void): void;
  // 30.3장 memberSeq는 구현이 붙인다
  sendState(state: MyRunState): void;
  // 함께 달리기 응원. toUserId가 없으면 모두에게. 보내졌으면 true
  sendCheer(toUserId: string | null): boolean;
  close(): void;
}
