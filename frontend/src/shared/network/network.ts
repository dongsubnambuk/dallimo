import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// 네트워크 연결 상태. 러닝 중 오프라인 안내와 기록 동기화(29.4장)가 쓴다.
// 웹(개발 확인용)은 브라우저 online/offline만 본다 (인터넷 확인 요청을 보내지 않음).
export type NetworkState = 'online' | 'offline';

if (Platform.OS === 'web') NetInfo.configure({ reachabilityShouldRun: () => false });

const toState = (s: NetInfoState): NetworkState =>
  s.isConnected === false || (Platform.OS !== 'web' && s.isInternetReachable === false) ? 'offline' : 'online';

let current: NetworkState = 'online';
const listeners = new Set<(s: NetworkState) => void>();
let started = false;

function set(next: NetworkState) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l(next));
}

function start() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((s) => set(toState(s)));
  // 웹: 브라우저에 따라 연결 복구를 NetInfo가 놓치는 경우가 있어 online/offline 이벤트도 본다
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('online', () => set('online'));
    window.addEventListener('offline', () => set('offline'));
  }
}

export function getNetworkState(): NetworkState {
  start();
  return current;
}

export function onNetworkChange(listener: (s: NetworkState) => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
