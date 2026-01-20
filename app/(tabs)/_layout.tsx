// app/(tabs)/_layout.tsx - Admin Layout with Payments Tab

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscribeToConversations } from '@/services/chatService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function TabLayout() {
  // State để lưu số lượng tin nhắn chưa đọc
  const [unreadChats, setUnreadChats] = useState(0);
  // State để lưu số lượng thanh toán chờ xác nhận
  const [pendingPayments, setPendingPayments] = useState(0);

  // Lắng nghe tin nhắn mới
  useEffect(() => {
    const unsubscribe = subscribeToConversations((convs) => {
      const unread = convs.reduce((sum, c) => sum + c.adminUnread, 0);
      setUnreadChats(unread);
    });

    return () => unsubscribe();
  }, []);

  // Lắng nghe thanh toán chờ xác nhận
  useEffect(() => {
    const q = query(
      collection(db, 'payments'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingPayments(snapshot.size);
    }, (error) => {
      console.error('Error listening to payments:', error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#9CA3AF',
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
      {/* ===== Tab 1: Dashboard ===== */}
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

      {/* ===== Tab 4: Thanh toán (MỚI) ===== */}
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Thanh toán',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="card" size={size} color={color} />
              {/* Badge hiển thị số thanh toán chờ xác nhận */}
              {pendingPayments > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingPayments > 9 ? '9+' : pendingPayments}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* ===== Tab 5: Tin nhắn ===== */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
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

      {/* ===== HIDDEN ROUTES ===== */}
      <Tabs.Screen name="vouchers" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
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