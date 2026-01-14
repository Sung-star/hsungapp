// services/notificationService.ts - Fixed version

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
  getDoc,
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
 * @param skipSettingsCheck - Bỏ qua kiểm tra settings (dùng cho admin gửi bulk)
 */
export const createNotification = async (
  params: CreateNotificationParams,
  skipSettingsCheck: boolean = false
): Promise<{ success: boolean; message: string; notificationId?: string }> => {
  try {
    console.log('📝 Creating notification for user:', params.userId, '| Skip settings:', skipSettingsCheck);
    
    // Check user notification settings (unless skipped)
    if (!skipSettingsCheck) {
      const settings = await getUserNotificationSettings(params.userId);
      console.log('⚙️ User settings:', settings);
      
      // Check if user wants this type of notification
      if (!settings.notifications) {
        console.log('❌ User disabled all notifications');
        return {
          success: false,
          message: 'User has disabled all notifications',
        };
      }

      if (params.type === 'order' && !settings.orderUpdates) {
        console.log('❌ User disabled order notifications');
        return {
          success: false,
          message: 'User has disabled order notifications',
        };
      }
      
      if (params.type === 'promotion' && !settings.promotions) {
        console.log('❌ User disabled promotion notifications');
        return {
          success: false,
          message: 'User has disabled promotion notifications',
        };
      }
    }

    // Build notification data
    const notificationData: Record<string, any> = {
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      isRead: false,
      createdAt: new Date(),
    };

    // Only add orderId if it's provided
    if (params.orderId) {
      notificationData.orderId = params.orderId;
    }

    console.log('📤 Saving notification:', notificationData);

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);

    console.log('✅ Notification created:', docRef.id, 'for user:', params.userId);

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
 * Send notification to multiple users (Admin function)
 * Bỏ qua settings check vì admin gửi = quan trọng
 */
export const sendBulkNotifications = async (
  params: SendBulkNotificationParams
): Promise<{ success: boolean; message: string; sent: number; failed: number }> => {
  try {
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    console.log('📬 ========== BULK NOTIFICATION START ==========');
    console.log('📬 Sending to', params.userIds.length, 'users');
    console.log('📬 Title:', params.title);
    console.log('📬 Type:', params.type);
    console.log('📋 User IDs:', params.userIds);

    // Gửi tuần tự để dễ debug
    for (let i = 0; i < params.userIds.length; i++) {
      const userId = params.userIds[i];
      console.log(`\n--- [${i + 1}/${params.userIds.length}] Processing user: ${userId} ---`);
      
      try {
        const result = await createNotification(
          {
            userId,
            title: params.title,
            body: params.body,
            type: params.type,
          },
          true // SKIP settings check for admin bulk send
        );
        
        if (result.success) {
          sentCount++;
          console.log(`✅ [${i + 1}] Success for ${userId}`);
        } else {
          failedCount++;
          errors.push(`${userId}: ${result.message}`);
          console.log(`❌ [${i + 1}] Failed for ${userId}: ${result.message}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`${userId}: ${err.message}`);
        console.error(`❌ [${i + 1}] Error for ${userId}:`, err);
      }
    }

    console.log('\n📬 ========== BULK NOTIFICATION END ==========');
    console.log(`📊 Results: Sent ${sentCount}, Failed ${failedCount}`);
    if (errors.length > 0) {
      console.log('❌ Errors:', errors);
    }

    return {
      success: sentCount > 0,
      message: `Đã gửi ${sentCount} thông báo${failedCount > 0 ? `, ${failedCount} thất bại` : ''}`,
      sent: sentCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    return {
      success: false,
      message: 'Failed to send bulk notifications',
      sent: 0,
      failed: params.userIds.length,
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
    console.log('🔍 Getting notifications for user:', userId);
    
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    console.log('📬 Found', snapshot.size, 'notifications');
    
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
  console.log('🔔 Subscribing to notifications for user:', userId);
  
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
    
    console.log('📬 Real-time update:', notifications.length, 'notifications for user:', userId);
    callback(notifications);
  }, (error) => {
    console.error('❌ Snapshot error:', error);
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
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as NotificationSettings;
      console.log('⚙️ Found settings for user:', userId, data);
      return data;
    }

    console.log('⚙️ No settings found, using defaults for user:', userId);
    
    // Default settings
    return {
      notifications: true,
      emailNotifications: true,
      orderUpdates: true,
      promotions: true,
    };
  } catch (error) {
    console.error('❌ Error getting notification settings:', error);
    return {
      notifications: true,
      emailNotifications: true,
      orderUpdates: true,
      promotions: true,
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
