import { getNotificationRepository } from '@/entities/notification/api';
import { API_BASE_URL } from '@/shared/api/config';
import { expoPushToken, notificationPermission } from '@/shared/notifications/notifier';

// Push 토큰 등록. 권한은 앱을 켜자마자 묻지 않는다. 가입 직후 권한 안내에서 고르게 하고(결정 로그 64항), 그때 미뤘으면 필요한 순간에 묻는다 (사용자 결정):
// 친구 요청을 보낼 때, 함께 달리기 방을 만들거나 참가할 때, 달리기를 시작할 때(달리는 중 알림).
// 이미 허락했으면 앱이 켜질 때 조용히 등록한다. EAS 프로젝트가 없거나 웹이면 토큰이 없어 등록하지 않는다.

let asked = false;
// 결정 로그 93항: 앱을 켤 때와 앞으로 올 때 등록이 겹쳐 서버에서 데드락이 났다. 하던 등록이 있으면 그 결과를 같이 쓰고,
// 이번 로그인에서 이미 올린 토큰은 다시 보내지 않는다 (로그인할 때마다 resetPushRegistration으로 비운다)
let inFlight: Promise<boolean> | null = null;
let registered: string | null = null;

export function registerPush(ask: boolean): Promise<boolean> {
  if (inFlight) return ask ? inFlight.then(() => registerPush(true)) : inFlight;
  const run = register(ask).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}

/** 로그인한 뒤 알림 준비를 시작할 때 (다른 계정으로 로그인했으면 같은 토큰도 다시 올려야 한다) */
export function resetPushRegistration() {
  registered = null;
}

async function register(ask: boolean): Promise<boolean> {
  const granted = await notificationPermission(ask);
  if (!granted || !API_BASE_URL) return granted;
  const t = await expoPushToken().catch((e) => {
    console.warn('[push] token', e);
    return null;
  });
  if (!t || t.token === registered) return granted;
  await getNotificationRepository()
    .registerToken(t.token, t.platform)
    .then(() => {
      registered = t.token;
    })
    .catch((e) => console.warn('[push] register', e));
  return granted;
}

/** 필요한 순간에 한 번 묻는다 (앱 실행 동안). 거절했으면 다시 묻지 않는다. 시스템 창이 닫힐 때 끝난다 */
export function askNotifications(): Promise<unknown> {
  if (asked) return Promise.resolve();
  asked = true;
  return registerPush(true).catch(() => undefined);
}
