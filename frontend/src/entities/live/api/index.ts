import { API_BASE_URL } from '@/shared/api/config';

import { createHttpLiveRoomRepository } from './httpLiveRoomRepository';
import type { LiveRoomRepository } from './liveRoomRepository';
import { createMockLiveRoomRepository, type LiveScenario } from './mockLiveRoomRepository';

// 서버 주소가 있고 개발용 상태가 normal이면 실제 서버, 아니면 mock (다른 저장소와 같은 규칙)
export function getLiveRoomRepository(scenario: LiveScenario = 'normal'): LiveRoomRepository {
  return API_BASE_URL && scenario === 'normal' ? createHttpLiveRoomRepository() : createMockLiveRoomRepository(scenario);
}

/** 방 id로 고른다: 서버 방 id는 숫자, 개발용 mock 방(r-demo 등)은 mock 저장소 */
export function liveRoomRepositoryFor(roomId: string, scenario: LiveScenario = 'normal'): LiveRoomRepository {
  return /^\d+$/.test(roomId) ? getLiveRoomRepository(scenario) : createMockLiveRoomRepository(scenario);
}
