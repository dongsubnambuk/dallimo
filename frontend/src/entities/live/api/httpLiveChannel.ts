import { Client, type IMessage } from '@stomp/stompjs';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/shared/api/config';
import { currentAccessToken } from '@/shared/api/http';

import type { LiveRoom } from '../types';
import type { LiveChannel, LiveEvent, MyRunState } from './liveChannel';
import { toLiveResult, toMemberStates, type MemberViewDto, type ResultDto } from './liveDto';

// 46장 Live WebSocket (backend LiveWebSocketConfig). STOMP over WebSocket, 주소는 서버 주소 + /ws.
// CONNECT 때 Access Token을 보낸다. 방 topic을 구독하면 서버가 내 queue로 최신 snapshot(SYNC_STATE)을 보낸다.
// 끊기면 다시 붙고, 다시 붙으면 snapshot으로 순위를 맞춘다. 끊긴 동안 개인 기록은 러닝 엔진이 계속한다 (32장).

// 명세에 값이 없어 정한 값 (FOUNDATION-DECISION-LOG 36항)
const RECONNECT_MS = 2_000;
// 방 참가 상태 유지(서버 presence 15초)
const HEARTBEAT_MS = 5_000;
// STOMP heartbeat. 서버와 같은 값. 두 번 못 받으면 끊긴 것으로 보고 다시 붙는다 (소리 없이 끊긴 휴대폰 망)
const STOMP_HEARTBEAT_MS = 5_000;

type ServerEvent =
  | { type: 'MEMBER_STATE'; members: MemberViewDto[] }
  | { type: 'SYNC_STATE'; status: string; members: MemberViewDto[]; result?: ResultDto }
  | { type: 'ROOM_FINISHED'; result: ResultDto }
  | { type: 'ERROR'; code: string; message: string }
  | { type: string };

export function wsUrl(base: string) {
  return `${base.replace(/^http/, 'ws')}/ws`;
}

export function createHttpLiveChannel(room: LiveRoom): LiveChannel {
  const roomId = room.id;
  const myUserId = room.members.find((m) => m.isMe)?.userId ?? null;
  let listener: ((e: LiveEvent) => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  // 앱을 다시 켜도 줄지 않게 시각 기반으로 올린다 (서버는 더 작은 seq를 버린다)
  let seq = 0;
  let last: MyRunState | null = null;
  let connected: boolean | null = null;
  let finished = false;

  const setConnected = (value: boolean) => {
    if (connected === value) return;
    connected = value;
    listener?.({ type: 'CONNECTION', connected: value });
  };

  const finish = (dto: ResultDto) => {
    if (finished) return;
    finished = true;
    listener?.({ type: 'ROOM_FINISHED', result: toLiveResult(dto, myUserId, last?.runId ?? null) });
  };

  const onMessage = (msg: IMessage) => {
    let e: ServerEvent;
    try {
      e = JSON.parse(msg.body) as ServerEvent;
    } catch {
      return;
    }
    if (e.type === 'MEMBER_STATE' || e.type === 'SYNC_STATE') {
      const s = e as Extract<ServerEvent, { type: 'SYNC_STATE' }>;
      listener?.({ type: 'MEMBER_STATE', members: toMemberStates(s.members, myUserId) });
      if (s.result) finish(s.result);
    } else if (e.type === 'ROOM_FINISHED') {
      finish((e as Extract<ServerEvent, { type: 'ROOM_FINISHED' }>).result);
    } else if (e.type === 'ERROR') {
      const err = e as Extract<ServerEvent, { type: 'ERROR' }>;
      console.warn('[live] server', err.code, err.message);
    }
  };

  const publish = (path: string, body?: unknown) => {
    // 방이 끝난 뒤에는 보내지 않는다
    if (finished || !client.connected) return false;
    client.publish({ destination: `/app/live-runs/${roomId}/${path}`, body: body === undefined ? '' : JSON.stringify(body) });
    return true;
  };

  const sendState = (s: MyRunState) =>
    publish('state', {
      seq: (seq = Math.max(seq + 1, Date.now())),
      distanceM: Math.round(s.distanceM),
      elapsedSeconds: Math.round(s.elapsedSec),
      currentPaceSecPerKm: s.paceSec != null ? Math.round(s.paceSec) : null,
      status: s.status,
      sentAt: new Date().toISOString(),
    });

  const client = new Client({
    brokerURL: wsUrl(API_BASE_URL ?? ''),
    reconnectDelay: RECONNECT_MS,
    heartbeatIncoming: STOMP_HEARTBEAT_MS,
    heartbeatOutgoing: STOMP_HEARTBEAT_MS,
    // heartbeat가 끊기면 close handshake를 기다리지 않고 바로 버린다 (망이 없으면 close가 끝나지 않는다)
    discardWebsocketOnCommFailure: true,
    // React Native WebSocket은 NULL 문자를 잘라 먹는다 (stompjs 문서)
    ...(Platform.OS !== 'web' ? { forceBinaryWSFrames: true, appendMissingNULLonIncoming: true } : {}),
    beforeConnect: async (c) => {
      const token = await currentAccessToken();
      c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      // 내 queue를 먼저 구독해야 방 구독 뒤 보내는 SYNC_STATE를 받는다
      client.subscribe('/user/queue/live-runs', onMessage);
      client.subscribe(`/topic/live-runs/${roomId}`, onMessage);
      setConnected(true);
      // 끊긴 동안 보내지 못한 마지막 상태(완주 · 포기 포함)를 다시 보낸다
      if (last) sendState(last);
    },
    onWebSocketClose: () => {
      if (listener) setConnected(false);
    },
    onStompError: (frame) => console.warn('[live] stomp', frame.headers.message),
  });

  return {
    connect(onEvent) {
      listener = onEvent;
      client.activate();
      heartbeat = setInterval(() => publish('heartbeat'), HEARTBEAT_MS);
    },
    sendState(state) {
      last = state;
      sendState(state);
    },
    close() {
      listener = null;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      void client.deactivate();
    },
  };
}
