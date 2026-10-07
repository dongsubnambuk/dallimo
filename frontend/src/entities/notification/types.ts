// 알림함 (NTF, 14.2장). 서버 NotificationResponse의 앱 쪽 모델.

// NOTICE: 관리 웹에서 보낸 서비스 공지 (결정 로그 87항)
export type NotificationType = 'FRIEND_REQUEST' | 'LIVE_INVITE' | 'LIVE_CANCELED' | 'RECORD_BEATEN' | 'CHALLENGE_DEFENDED' | 'NOTICE';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  // 누르면 열 앱 안 경로 (예: /together/12)
  link: string | null;
  read: boolean;
  createdAt: number;
};

// 종류별 Push 설정 (설정 화면). 꺼도 알림함에는 남는다
export type NotificationSettings = { friend: boolean; live: boolean; record: boolean };
