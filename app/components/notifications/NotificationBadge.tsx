// components/notifications/NotificationBadge.tsx - Badge hiển thị số thông báo chưa đọc

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showBadge?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = 'medium',
  color = '#1F2937',
  showBadge = true,
}) => {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const iconSize = {
    small: 20,
    medium: 24,
    large: 28,
  }[size];

  const badgeSize = {
    small: 16,
    medium: 18,
    large: 20,
  }[size];

  // Animation khi có notification mới
  useEffect(() => {
    if (unreadCount > 0) {
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Bounce animation
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [unreadCount]);

  const handlePress = () => {
    router.push('/client/notifications');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <Ionicons name="notifications-outline" size={iconSize} color={color} />
      </Animated.View>

      {showBadge && unreadCount > 0 && (
        <Animated.View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: badgeSize * 0.6 }]}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default NotificationBadge;
