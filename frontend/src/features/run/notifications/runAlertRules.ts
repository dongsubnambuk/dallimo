import type { RunStatus } from '@/entities/run/types';
import type { GpsQuality } from '@/shared/location/locationSource';

// 달리는 중 로컬 알림 규칙 (사용자 결정). 화면을 보고 있으면 화면 · 음성이 알리므로, 화면이 꺼졌거나 앱이 뒤에 있을 때만 띄운다.
// 같은 알림은 상황이 풀렸다가 다시 생겨야 다시 알리고, 최소 2분 간격. 일시정지 30분 알림만 예약이라 화면과 상관없이 건다.
// 판단만 한다 (알림 API는 부르지 않는다). 부르는 곳: runAlerts.ts

export const RUN_ALERT = {
  // GPS가 이만큼 계속 약하면 알린다
  gpsWeakMs: 30_000,
  // 같은 알림 최소 간격
  minGapMs: 120_000,
  // 일시정지한 채 이만큼 지나면 알린다
  pausedMs: 30 * 60_000,
} as const;

export const RUN_ALERT_IDS = { gps: 'run-gps', route: 'run-route', done: 'run-done', paused: 'run-paused' } as const;

export type RunAlertInput = {
  now: number;
  // 화면이 꺼졌거나 앱이 뒤에 있다
  background: boolean;
  // 설정 "달리는 중 알림"
  enabled: boolean;
  status: RunStatus;
  gps: GpsQuality;
  // 코스 러닝: 지속 이탈 중이면 코스까지 거리, 아니면 null
  offRouteM: number | null;
  // 코스 끝에 닿은 기록(초). 아직이면 null
  courseDoneSec: number | null;
};

export type RunAlertAction =
  | { kind: 'show'; id: string; title: string; body: string }
  | { kind: 'schedule'; id: string; at: number; title: string; body: string }
  | { kind: 'cancel'; id: string };

const WEAK: GpsQuality[] = ['acquiring', 'poor', 'unavailable'];
const ENDED: RunStatus[] = ['FINISHING', 'FINISHED', 'CANCELED'];

const clock = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export function createRunAlertRules() {
  let weakSince: number | null = null;
  let gpsAlerted = false;
  let lastGpsAt = -Infinity;
  let routeAlerted = false;
  let lastRouteAt = -Infinity;
  let doneAlerted = false;
  let pausedScheduled = false;

  return (i: RunAlertInput): RunAlertAction[] => {
    const out: RunAlertAction[] = [];
    const canShow = i.background && i.enabled;

    // 끝났으면 예약한 일시정지 알림을 지운다
    if (ENDED.includes(i.status)) {
      if (pausedScheduled) out.push({ kind: 'cancel', id: RUN_ALERT_IDS.paused });
      pausedScheduled = false;
      return out;
    }

    // 일시정지 방치
    if (i.status === 'PAUSED' && !pausedScheduled && i.enabled) {
      pausedScheduled = true;
      out.push({ kind: 'schedule', id: RUN_ALERT_IDS.paused, at: i.now + RUN_ALERT.pausedMs, title: '달리기가 일시정지돼 있어요', body: '30분째 멈춰 있어요. 끝낼까요?' });
    } else if (i.status !== 'PAUSED' && pausedScheduled) {
      pausedScheduled = false;
      out.push({ kind: 'cancel', id: RUN_ALERT_IDS.paused });
    }

    // GPS 약함 (달리는 중에만)
    if (i.status === 'RUNNING' && WEAK.includes(i.gps)) {
      weakSince ??= i.now;
      if (!gpsAlerted && i.now - weakSince >= RUN_ALERT.gpsWeakMs && i.now - lastGpsAt >= RUN_ALERT.minGapMs && canShow) {
        gpsAlerted = true;
        lastGpsAt = i.now;
        out.push({ kind: 'show', id: RUN_ALERT_IDS.gps, title: 'GPS 신호가 약해요', body: '기록이 멈췄어요. 하늘이 트인 곳으로 가면 이어져요' });
      }
    } else if (i.gps === 'good' || i.gps === 'fair') {
      weakSince = null;
      gpsAlerted = false;
    }

    // 코스 이탈
    if (i.offRouteM != null) {
      if (!routeAlerted && i.now - lastRouteAt >= RUN_ALERT.minGapMs && canShow) {
        routeAlerted = true;
        lastRouteAt = i.now;
        out.push({ kind: 'show', id: RUN_ALERT_IDS.route, title: '코스에서 벗어났어요', body: `코스에서 ${Math.round(i.offRouteM)}m 떨어져 있어요. 코스로 돌아가 주세요` });
      }
    } else {
      routeAlerted = false;
    }

    // 코스 완주 (화면을 보고 있었으면 이미 봤으니 알리지 않는다)
    if (i.courseDoneSec != null && !doneAlerted) {
      doneAlerted = true;
      if (canShow) out.push({ kind: 'show', id: RUN_ALERT_IDS.done, title: `코스 완주 · ${clock(i.courseDoneSec)}`, body: '멈추고 기록을 저장해 주세요' });
    }
    return out;
  };
}
