import type { IconName } from '@/design/primitives';
import type { ActiveRunSnapshot } from '@/features/run/engine/runningEngine';
import { formatDuration } from '@/shared/format';

// 러닝 중 상태 안내 (한 번에 하나). SCREEN-SPECS: GPS poor, offline, recovering. 휴대폰 화면과 워치가 같은 문구를 쓴다
// short: 워치 한 줄 (작은 화면)
export type RunNotice = { icon: IconName; text: string; short: string; tone: 'warning' | 'neutral' | 'success' };

export type RunNoticeInput = Pick<ActiveRunSnapshot, 'status' | 'gps' | 'network' | 'autoPaused'> & { offRouteM: number | null; completedMs: number | null };

export function runNoticeOf(s: RunNoticeInput): RunNotice | null {
  if (s.completedMs != null) return { icon: 'finished', text: `코스 완주 · ${formatDuration(Math.round(s.completedMs / 1000))}. 이 기록으로 저장돼요`, short: '코스 완주', tone: 'success' };
  if (s.autoPaused) return { icon: 'pause', text: '멈춰 있어서 기록을 잠시 멈췄어요. 다시 달리면 이어서 기록해요', short: '자동 일시정지', tone: 'neutral' };
  if (s.status === 'RECOVERY') return { icon: 'gpsAcquiring', text: '앱이 꺼지기 전 기록을 불러왔어요. GPS를 다시 찾는 중이에요', short: 'GPS 찾는 중', tone: 'neutral' };
  if (s.offRouteM != null) return { icon: 'warning', text: `코스에서 ${s.offRouteM}m 벗어났어요. 코스로 돌아가 주세요`, short: `코스 이탈 ${s.offRouteM}m`, tone: 'warning' };
  if (s.gps === 'poor') return { icon: 'gpsPoor', text: 'GPS 신호가 약해 거리를 잠시 세지 않아요', short: 'GPS 약함', tone: 'warning' };
  if (s.network === 'offline') return { icon: 'offline', text: '오프라인이에요. 기록은 휴대폰에 저장하고 있어요', short: '오프라인', tone: 'neutral' };
  return null;
}
