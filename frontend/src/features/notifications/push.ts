import { getNotificationRepository } from '@/entities/notification/api';
import { API_BASE_URL } from '@/shared/api/config';
import { expoPushToken, notificationPermission } from '@/shared/notifications/notifier';

// Push 토큰 등록. 권한은 앱을 켜자마자 묻지 않고 필요한 순간에 묻는다 (사용자 결정):
// 친구 요청을 보낼 때, 함께 달리기 방을 만들거나 참가할 때, 달리기를 시작할 때(달리는 중 알림).
// 이미 허락했으면 앱이 켜질 때 조용히 등록한다. EAS 프로젝트가 없거나 웹이면 토큰이 없어 등록하지 않는다.

let asked = false;

export async function registerPush(ask: boolean): Promise<boolean> {
  const granted = await notificationPermission(ask);
  if (!granted || !API_BASE_URL) return granted;
  const t = await expoPushToken().catch((e) => {
    console.warn('[push] token', e);
    return null;
  });
  if (t) await getNotificationRepository().registerToken(t.token, t.platform).catch((e) => console.warn('[push] register', e));
  return granted;
}

/** 필요한 순간에 한 번 묻는다 (앱 실행 동안). 거절했으면 다시 묻지 않는다. 시스템 창이 닫힐 때 끝난다 */
export function askNotifications(): Promise<unknown> {
  if (asked) return Promise.resolve();
  asked = true;
  return registerPush(true).catch(() => undefined);
}
