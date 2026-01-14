// hooks/useNotifications.ts - ✅ Fixed Real-time Notifications Hook

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/config/firebase';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
  subscribeToNotifications,
} from '@/services/notificationService';
import { Notification } from '@/types/notification';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log('🔔 Setting up notifications listener for user:', user.uid);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      console.log('📬 Received notifications update:', newNotifications.length);
      setNotifications(newNotifications);
      
      // ✅ Đếm số thông báo chưa đọc từ dữ liệu real-time
      const unread = newNotifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      console.log('📊 Unread count:', unread);
      
      setLoading(false);
    });

    return () => {
      console.log('🔕 Unsubscribing from notifications');
      unsubscribe();
    };
  }, []);

  // Đánh dấu 1 thông báo đã đọc
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await markAsReadService(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        console.log('✅ Marked notification as read:', notificationId);
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      return false;
    }
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      const success = await markAllAsReadService(user.uid);
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        console.log('✅ Marked all notifications as read');
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      return false;
    }
  }, []);

  // Refresh notifications
  const refresh = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getUserNotifications(user.uid),
        getUnreadCount(user.uid),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
};