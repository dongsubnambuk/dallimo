import { API_BASE_URL } from '@/shared/api/config';

import { createHttpNotificationRepository } from './httpNotificationRepository';
import { createMockNotificationRepository } from './mockNotificationRepository';
import type { NotificationRepository } from './notificationRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock
export function getNotificationRepository(): NotificationRepository {
  return API_BASE_URL ? createHttpNotificationRepository() : createMockNotificationRepository();
}
