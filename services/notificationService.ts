// services/notificationService.ts - Notification Service

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Notification,
  CreateNotificationParams,
  SendBulkNotificationParams,
  NotificationSettings,
} from '@/types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';
const USER_SETTINGS_COLLECTION = 'userSettings';

/**
 * Create a notification for a user
 */
export const createNotification = async (
  params: CreateNotificationParams
): Promise<{ success: boolean; message: string; notificationId?: string }> => {
  try {
    // Check user notification settings first
    const settings = await getUserNotificationSettings(params.userId);
    
    // Check if user wants this type of notification
    if (params.type === 'order' && !settings.orderUpdates) {
      return {
        success: false,
        message: 'User has disabled order notifications',
      };
    }
    
    if (params.type === 'promotion' && !settings.promotions) {
      return {
        success: false,
        message: 'User has disabled promotion notifications',
      };
    }

    const notificationData: Omit<Notification, 'id'> = {
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      orderId: params.orderId,
      isRead: false,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);

    console.log('✅ Notification created:', docRef.id);

    return {
      success: true,
      message: 'Notification created successfully',
      notificationId: docRef.id,
    };
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return {
      success: false,
      message: 'Failed to create notification',
    };
  }
};

/**
 * Send notification to multiple users
 */
export const sendBulkNotifications = async (
  params: SendBulkNotificationParams
): Promise<{ success: boolean; message: string; sent: number }> => {
  try {
    let sentCount = 0;

    const promises = params.userIds.map(async (userId) => {
      const result = await createNotification({
        userId,
        title: params.title,
        body: params.body,
        type: params.type,
      });
      if (result.success) sentCount++;
    });

    await Promise.all(promises);

    return {
      success: true,
      message: `Sent ${sentCount} notifications`,
      sent: sentCount,
    };
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    return {
      success: false,
      message: 'Failed to send bulk notifications',
      sent: 0,
    };
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return [];
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      isRead: true,
    });
    return true;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    
    const promises = snapshot.docs.map(docSnapshot =>
      updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docSnapshot.id), {
        isRead: true,
      })
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    return false;
  }
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    
    callback(notifications);
  });
};

/**
 * Get user notification settings
 */
export const getUserNotificationSettings = async (
  userId: string
): Promise<NotificationSettings> => {
  try {
    const docRef = doc(db, USER_SETTINGS_COLLECTION, userId);
    const docSnap = await getDocs(query(collection(db, USER_SETTINGS_COLLECTION), where('__name__', '==', userId)));
    
    if (!docSnap.empty) {
      return docSnap.docs[0].data() as NotificationSettings;
    }

    // Default settings
    return {
      notifications: true,
      emailNotifications: true,
      orderUpdates: true,
      promotions: false,
    };
  } catch (error) {
    console.error('❌ Error getting notification settings:', error);
    return {
      notifications: true,
      emailNotifications: true,
      orderUpdates: true,
      promotions: false,
    };
  }
};

/**
 * Create notification when order status changes
 */
export const notifyOrderStatusChange = async (
  userId: string,
  orderId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  const statusMessages: Record<string, string> = {
    pending: 'Đơn hàng đang chờ xử lý',
    confirmed: 'Đơn hàng đã được xác nhận',
    processing: 'Đơn hàng đang được chuẩn bị',
    shipping: 'Đơn hàng đang được giao',
    delivered: 'Đơn hàng đã được giao thành công',
    cancelled: 'Đơn hàng đã bị hủy',
  };

  await createNotification({
    userId,
    title: 'Cập nhật đơn hàng',
    body: statusMessages[newStatus] || 'Trạng thái đơn hàng đã thay đổi',
    type: 'order',
    orderId,
  });
};