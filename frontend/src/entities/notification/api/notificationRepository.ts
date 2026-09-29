import type { AppNotification, NotificationSettings } from '../types';

export interface NotificationRepository {
  list(cursor: string | null): Promise<{ items: AppNotification[]; nextCursor: string | null }>;
  read(id: string): Promise<void>;
  readAll(): Promise<void>;
  unreadCount(): Promise<number>;
  settings(): Promise<NotificationSettings>;
  saveSettings(s: NotificationSettings): Promise<NotificationSettings>;
  // 이 기기의 Expo Push 토큰 (로그인 세션의 기기)
  registerToken(token: string, platform: 'ios' | 'android'): Promise<void>;
  unregisterToken(): Promise<void>;
}
