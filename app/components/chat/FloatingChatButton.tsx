// components/chat/FloatingChatButton.tsx - Fixed TypeScript error

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router'; // ← Bỏ useSegments
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/config/firebase';
import { getTotalUnreadCount } from '@/services/chatService';

const FloatingChatButton: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const pathname = usePathname();
  const user = auth.currentUser;

  // ✅ FIX: Chỉ dùng pathname để check - đơn giản hơn
  const isOnChatPage = pathname?.includes('chat') || pathname === '/client/chat';

  // Load unread count
  useEffect(() => {
    if (!user) return;

    const loadUnread = async () => {
      try {
        const count = await getTotalUnreadCount(user.uid, false);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Pulse animation
  useEffect(() => {
    if (unreadCount > 0) {
      const pulse = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]);
      Animated.loop(pulse, { iterations: 3 }).start();
    }
  }, [unreadCount]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    router.push('/client/chat');
  };

  // Không hiển thị khi: chưa login HOẶC đang ở trang chat
  if (!user || isOnChatPage) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
          
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {unreadCount > 0 && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {unreadCount} tin nhắn mới
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 90,
    right: 20,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tooltip: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default FloatingChatButton;