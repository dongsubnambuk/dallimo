import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 휴대폰 알림 경계 (expo-notifications). 화면 · 기능 코드는 이 파일만 쓴다. 웹은 notifier.web.ts (아무것도 하지 않는다).
// 채널: default = 서버 Push(친구 · 함께 달리기 · 기록), run = 달리는 중 · 기록 알림(소리 없이 진동)

export type Channel = 'default' | 'run';
export type NotificationData = Record<string, unknown>;

let suppress: () => boolean = () => false;

/** 달리는 중에는 서버 Push를 화면에 띄우지 않는다 (알림 목록에는 남는다). 러닝 엔진 쪽에서 판단을 넣어 준다 */
export function setForegroundSuppressor(fn: () => boolean) {
  suppress = fn;
}

let ready: Promise<void> | null = null;

/** 앱이 켜질 때 한 번: 앞에 있을 때 보여줄지, Android 채널 */
export function setupNotifications(): Promise<void> {
  ready ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        const run = n.request.content.data?.channel === 'run';
        const show = run || !suppress();
        return { shouldShowBanner: show, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
      },
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: '친구 · 함께 달리기 · 기록', importance: Notifications.AndroidImportance.HIGH });
      await Notifications.setNotificationChannelAsync('run', {
        name: '달리는 중 알림',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        vibrationPattern: [0, 250, 150, 250],
      });
    }
  })().catch((e) => console.warn('[notifications] setup', e));
  return ready;
}

/** 알림 권한. ask면 아직 묻지 않았을 때만 묻는다 (거절한 사람에게 다시 묻지 않는다) */
export async function notificationPermission(ask: boolean): Promise<boolean> {
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return true;
  if (!ask || !now.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Expo Push 토큰. EAS 프로젝트(app.json extra.eas.projectId)가 없으면 받을 수 없다 */
export async function expoPushToken(): Promise<{ token: string; platform: 'ios' | 'android' } | null> {
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: data, platform: Platform.OS };
}

const content = (title: string, body: string, data: NotificationData, channel: Channel) => ({
  title,
  body,
  data: { ...data, channel },
  sound: channel === 'run' ? undefined : 'default',
});

/** 지금 띄운다. 같은 id는 바꿔 쓴다 */
export async function showNow(id: string, title: string, body: string, data: NotificationData = {}, channel: Channel = 'run') {
  await setupNotifications();
  if (!(await notificationPermission(false))) return;
  await Notifications.scheduleNotificationAsync({ identifier: id, content: content(title, body, data, channel), trigger: channel === 'run' ? { channelId: 'run' } : null });
}

/** at(epoch ms)에 띄운다. 같은 id는 바꿔 예약한다 */
export async function scheduleAt(id: string, at: number, title: string, body: string, data: NotificationData = {}, channel: Channel = 'run') {
  await setupNotifications();
  if (!(await notificationPermission(false)) || at <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: content(title, body, data, channel),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: channel },
  });
}

export async function cancel(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function scheduledIds(): Promise<string[]> {
  return (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
}

/** 알림을 눌렀을 때 (앱이 꺼져 있다가 알림으로 켜진 경우 포함) */
export function onNotificationTap(cb: (data: NotificationData) => void): () => void {
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    // 한 번만 연다 (다시 로그인해 탭이 새로 떠도 같은 알림 화면으로 다시 가지 않게)
    Notifications.clearLastNotificationResponse();
    cb(last.notification.request.content.data ?? {});
  }
  const sub = Notifications.addNotificationResponseReceivedListener((r) => cb(r.notification.request.content.data ?? {}));
  return () => sub.remove();
}
