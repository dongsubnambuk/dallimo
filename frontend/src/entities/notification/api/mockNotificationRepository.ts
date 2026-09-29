import type { AppNotification, NotificationSettings } from '../types';
import type { NotificationRepository } from './notificationRepository';

// 서버 없이 확인할 때의 알림함. 앱 실행 동안 읽음이 유지된다
const MIN = 60_000;
let items: AppNotification[] | null = null;
let settings: NotificationSettings = { friend: true, live: true, record: true };

function initial(): AppNotification[] {
  const now = Date.now();
  return [
    { id: 'n-1', type: 'FRIEND_REQUEST', title: '친구 요청', body: '준호님이 친구 요청을 보냈어요', link: '/my/friends', read: false, createdAt: now - 12 * MIN },
    { id: 'n-2', type: 'LIVE_INVITE', title: '함께 달리기 초대', body: '민수님이 5km 레이스에 초대했어요', link: '/together/r-invited', read: false, createdAt: now - 95 * MIN },
    { id: 'n-3', type: 'RECORD_BEATEN', title: '내 코스 기록을 넘었어요', body: '지수님이 들안로 왕복에서 17:40로 내 기록 18:10을 넘었어요', link: '/course/c-deuran', read: true, createdAt: now - 26 * 60 * MIN },
    { id: 'n-4', type: 'CHALLENGE_DEFENDED', title: '도전을 막아냈어요', body: '하늘님이 수성못 둘레길 내 기록에 도전했지만 넘지 못했어요', link: '/course/c-suseongmot', read: true, createdAt: now - 3 * 24 * 60 * MIN },
  ];
}

export function createMockNotificationRepository(): NotificationRepository {
  const all = () => (items ??= initial());
  return {
    async list() {
      await new Promise((r) => setTimeout(r, 300));
      return { items: all(), nextCursor: null };
    },
    async read(id) {
      const n = all().find((x) => x.id === id);
      if (n) n.read = true;
    },
    async readAll() {
      all().forEach((n) => (n.read = true));
    },
    async unreadCount() {
      return all().filter((n) => !n.read).length;
    },
    async settings() {
      return settings;
    },
    async saveSettings(s) {
      settings = s;
      return s;
    },
    async registerToken() {},
    async unregisterToken() {},
  };
}
