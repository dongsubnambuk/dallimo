import type { CursorPage } from '@/shared/api/contract';
import { apiRequest } from '@/shared/api/http';

import type { AppNotification, NotificationSettings, NotificationType } from '../types';
import type { NotificationRepository } from './notificationRepository';

// 알림 API (backend NotificationController)
type Dto = { id: number; type: NotificationType; title: string; body: string; link: string | null; read: boolean; createdAt: string };

const toNotification = (n: Dto): AppNotification => ({ ...n, id: String(n.id), createdAt: Date.parse(n.createdAt) });

export function createHttpNotificationRepository(): NotificationRepository {
  return {
    list: async (cursor) => {
      const page = await apiRequest<CursorPage<Dto>>('/api/v1/notifications', { query: { size: '30', ...(cursor ? { cursor } : {}) } });
      return { items: page.items.map(toNotification), nextCursor: page.nextCursor };
    },
    read: (id) => apiRequest<void>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    readAll: () => apiRequest<void>('/api/v1/notifications/read-all', { method: 'POST' }),
    unreadCount: async () => (await apiRequest<{ count: number }>('/api/v1/notifications/unread-count')).count,
    settings: () => apiRequest<NotificationSettings>('/api/v1/users/me/notification-settings'),
    saveSettings: (s) => apiRequest<NotificationSettings>('/api/v1/users/me/notification-settings', { method: 'PUT', body: s }),
    registerToken: (token, platform) => apiRequest<void>('/api/v1/users/me/push-token', { method: 'PUT', body: { token, platform } }),
    unregisterToken: () => apiRequest<void>('/api/v1/users/me/push-token', { method: 'DELETE' }),
  };
}
