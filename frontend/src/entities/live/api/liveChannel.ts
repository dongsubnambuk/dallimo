import type { LiveMemberState, LiveResult } from '../types';

// 46장 WebSocket 메시지 계약 중 화면에 필요한 부분.
// C→S RUN_STATE: 내 거리·경과·페이스·상태. S→C MEMBER_STATE / MEMBER_CONNECTION / ROOM_FINISHED.
// 실제 채널 구현이 46장 필드로 바꿔 보낸다: elapsedSec → elapsedMs(×1000), paceSec → currentPace,
// roomId · memberSeq · sentAt은 채널이 붙인다. runId는 실제로는 시작 때(POST /runs) 이미 있으므로 매번 보낸다.
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
  | { type: 'ROOM_FINISHED'; result: LiveResult };

export interface LiveChannel {
  connect(onEvent: (e: LiveEvent) => void): void;
  // 30.3장 memberSeq는 구현이 붙인다
  sendState(state: MyRunState): void;
  close(): void;
}
