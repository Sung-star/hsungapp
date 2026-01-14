// app/(tabs)/_layout.tsx - Cấu hình layout cho các tab của màn hình quản trị viên.

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscribeToConversations } from '@/services/chatService';

export default function TabLayout() {
  // State để lưu số lượng tin nhắn chưa đọc
  const [unreadChats, setUnreadChats] = useState(0);

  // Sử dụng useEffect để lắng nghe sự kiện tin nhắn mới trong thời gian thực
  useEffect(() => {
    // Gọi service để đăng ký lắng nghe các cuộc hội thoại
    const unsubscribe = subscribeToConversations((convs) => {
      // Tính tổng số tin nhắn chưa đọc từ tất cả các cuộc hội thoại
      const unread = convs.reduce((sum, c) => sum + c.adminUnread, 0);
      setUnreadChats(unread);
    });

    // Hủy đăng ký lắng nghe khi component bị unmount
    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ẩn header mặc định của các màn hình
        tabBarActiveTintColor: '#22C55E', // Màu sắc cho tab được chọn
        tabBarInactiveTintColor: '#9CA3AF', // Màu sắc cho tab không được chọn
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* ===== Tab 1: Bảng điều khiển (Dashboard) ===== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      {/* ===== Tab 2: Sản phẩm ===== */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />

      {/* ===== Tab 3: Đơn hàng ===== */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />

      {/* ===== Tab 4: Vouchers / Khuyến mãi ===== */}
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Vouchers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />

      {/* ===== Tab 5: Tin nhắn (có hiển thị số tin chưa đọc) ===== */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {/* Hiển thị badge nếu có tin nhắn chưa đọc */}
              {unreadChats > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* ===== Tab 6: Cá nhân ===== */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* ===== CÁC ROUTE ẨN (không hiển thị trên tab bar) ===== */}
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

// Stylesheet cho component
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444', // Màu đỏ cho badge
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});