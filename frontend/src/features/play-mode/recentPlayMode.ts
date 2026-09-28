import type { PlayModeKey } from '@/entities/run/types';

// 66장 "최근 사용 강조". 앱을 켜 둔 동안만 기억한다 (저장소 연동은 My/설정 단계에서).
let recent: PlayModeKey | null = null;

export function getRecentPlayMode() {
  return recent;
}

export function setRecentPlayMode(mode: PlayModeKey) {
  recent = mode;
}
