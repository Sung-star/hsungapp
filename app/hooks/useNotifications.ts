// hooks/useNotifications.ts - Real-time Notifications Hook

import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
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
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      const unread = newNotifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    });

    // Load initial unread count
    loadUnreadCount();

    return () => unsubscribe();
  }, []);

  const loadUnreadCount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const count = await getUnreadCount(user.uid);
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const success = await markAllAsRead(user.uid);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadUnreadCount,
  };
};