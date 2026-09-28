import type { CreateRoomInput, Friend, LiveRoom, LiveRoomSummary } from '../types';

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
  leave(roomId: string): Promise<void>;
}

export class LiveRoomError extends Error {
  constructor(
    readonly kind: 'network' | 'notFound',
    message: string,
  ) {
    super(message);
  }
}
