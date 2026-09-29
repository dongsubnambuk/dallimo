import { AppState } from 'react-native';

import { getPreferences } from '@/shared/preferences';
import { cancel, scheduleAt, showNow } from '@/shared/notifications/notifier';

import type { RunningEngine } from '../engine/runningEngine';
import { createRunAlertRules, RUN_ALERT_IDS } from './runAlertRules';

// 러닝 엔진 상태가 바뀔 때마다(백그라운드 위치 수신 포함) 달리는 중 알림 규칙을 돌린다
export function attachRunAlerts(engine: RunningEngine): () => void {
  const rules = createRunAlertRules();
  const check = () => {
    const s = engine.getSnapshot();
    const actions = rules({
      now: Date.now(),
      background: AppState.currentState !== 'active',
      enabled: getPreferences().runAlerts,
      status: s.status,
      gps: s.gps,
      offRouteM: s.course?.offRouteM ?? null,
      courseDoneSec: s.course?.completedActiveMs != null ? Math.round(s.course.completedActiveMs / 1000) : null,
    });
    for (const a of actions) {
      if (a.kind === 'show') void showNow(a.id, a.title, a.body, { link: '/run/active' });
      else if (a.kind === 'schedule') void scheduleAt(a.id, a.at, a.title, a.body, { link: '/run/active' });
      else void cancel(a.id);
    }
  };
  const unsubscribe = engine.subscribe(check);
  return () => {
    unsubscribe();
    // 러닝이 끝나면 남은 예약을 지운다
    void cancel(RUN_ALERT_IDS.paused);
  };
}

