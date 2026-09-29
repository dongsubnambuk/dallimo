import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { getNotificationRepository } from '@/entities/notification/api';
import { isRunning } from '@/features/run/engine/activeRunSession';
import { onNotificationTap, setForegroundSuppressor, setupNotifications } from '@/shared/notifications/notifier';

import { registerPush } from './push';

// 로그인한 뒤 탭이 뜰 때 한 번: 알림 채널 · 앞에 있을 때 표시 규칙 · 이미 허락했으면 토큰 등록 · 알림을 눌렀을 때 이동
export function useNotificationSetup() {
  const qc = useQueryClient();
  useEffect(() => {
    // 달리는 중에는 친구 · 함께 달리기 · 기록 Push를 화면에 띄우지 않는다 (알림 목록 · 알림함에는 남는다)
    setForegroundSuppressor(isRunning);
    void setupNotifications().then(() => registerPush(false));
    return onNotificationTap((data) => {
      if (data.notificationId != null) void getNotificationRepository().read(String(data.notificationId)).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (typeof data.link === 'string' && data.link.startsWith('/')) router.push(data.link as Href);
    });
  }, [qc]);
}
