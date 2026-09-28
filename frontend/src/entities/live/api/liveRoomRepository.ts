import type { CreateRoomInput, Friend, LiveResult, LiveRoom, LiveRoomSummary } from '../types';

// 45장 Together REST. 방 생성·참가·Ready·조회는 REST로, 러닝 중 진행 상태는 WebSocket으로 받는다 (9장 563행).
// 대기실은 WebSocket ROOM_SNAPSHOT이 오기 전까지 방 snapshot을 다시 읽어 상태를 맞춘다.
export interface LiveRoomRepository {
  listUpcoming(): Promise<LiveRoom[]>;
  listRecent(): Promise<LiveRoomSummary[]>;
  listFriends(): Promise<Friend[]>;
  create(input: CreateRoomInput): Promise<LiveRoom>;
  get(roomId: string): Promise<LiveRoom>;
  join(roomId: string): Promise<LiveRoom>;
  setReady(roomId: string, ready: boolean): Promise<LiveRoom>;
  // POST /live-runs/{roomId}/leave: 참가자 나가기 (러닝 중이면 DNF)
  leave(roomId: string): Promise<void>;
  // POST /live-runs/{roomId}/cancel: 방장이 시작 전에 방을 취소
  cancel(roomId: string): Promise<void>;
  // SCR-T05 최종 결과 (서버 finalization 값)
  getResult(roomId: string): Promise<LiveResult>;
  // TGT-012 재대결: 같은 조건·같은 사람으로 새 방
  rematch(roomId: string): Promise<LiveRoom>;
}

export class LiveRoomError extends Error {
  constructor(
    readonly kind: 'network' | 'notFound',
    message: string,
  ) {
    super(message);
  }
}
