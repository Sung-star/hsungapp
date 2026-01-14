// components/notifications/NotificationItem.tsx - Notification Item Component

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification, NotificationType } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: () => void;
}

// Icon và màu theo loại notification
const notificationConfig: Record<
  NotificationType,
  { icon: string; color: string; bgColor: string }
> = {
  order: {
    icon: 'cube',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  system: {
    icon: 'settings',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  promotion: {
    icon: 'gift',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
};

// Format thời gian
const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const config = notificationConfig[notification.type];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Convert Firestore Timestamp to Date
  const createdAt =
    notification.createdAt instanceof Date
      ? notification.createdAt
      : (notification.createdAt as any)?.toDate?.() || new Date();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead();
    }
    onPress?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.container,
          !notification.isRead && styles.containerUnread,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Unread Indicator */}
        {!notification.isRead && <View style={styles.unreadDot} />}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon as any} size={24} color={config.color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                !notification.isRead && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={styles.time}>{formatTime(createdAt)}</Text>
          </View>
          <Text
            style={[styles.body, !notification.isRead && styles.bodyUnread]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>

          {/* Order ID if exists */}
          {notification.orderId && (
            <View style={styles.orderTag}>
              <Ionicons name="receipt-outline" size={12} color="#3B82F6" />
              <Text style={styles.orderTagText}>
                #{notification.orderId.slice(-8).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingLeft: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  containerUnread: {
    backgroundColor: '#F0F9FF',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '600',
    color: '#1F2937',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bodyUnread: {
    color: '#4B5563',
  },
  orderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  orderTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default NotificationItem;
