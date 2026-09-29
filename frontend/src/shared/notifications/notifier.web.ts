// 웹(개발 확인용)에는 휴대폰 알림이 없다. notifier.ts와 같은 모양으로 아무것도 하지 않는다.

export type Channel = 'default' | 'run';
export type NotificationData = Record<string, unknown>;

export function setForegroundSuppressor(_fn: () => boolean) {}
export async function setupNotifications() {}
export async function notificationPermission(_ask: boolean) {
  return false;
}
export async function expoPushToken(): Promise<{ token: string; platform: 'ios' | 'android' } | null> {
  return null;
}
export async function showNow(_id: string, _title: string, _body: string, _data?: NotificationData, _channel?: Channel) {}
export async function scheduleAt(_id: string, _at: number, _title: string, _body: string, _data?: NotificationData, _channel?: Channel) {}
export async function cancel(_id: string) {}
export async function scheduledIds(): Promise<string[]> {
  return [];
}
export function onNotificationTap(_cb: (data: NotificationData) => void): () => void {
  return () => undefined;
}
