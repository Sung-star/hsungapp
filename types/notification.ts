// types/notification.ts - Notification Type Definitions

export type NotificationType = 'order' | 'system' | 'promotion';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  orderId?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  notifications: boolean;
  emailNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  orderId?: string;
}

export interface SendBulkNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
}