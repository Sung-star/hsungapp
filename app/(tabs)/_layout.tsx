// app/(tabs)/_layout.tsx - Admin Layout (Gift voucher is inside Vouchers tab)

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscribeToConversations } from '@/services/chatService';

export default function TabLayout() {
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToConversations((convs) => {
      const unread = convs.reduce((sum, c) => sum + c.adminUnread, 0);
      setUnreadChats(unread);
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
      {/* ===== TAB 1: Dashboard ===== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      {/* ===== TAB 2: Products ===== */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />

      {/* ===== TAB 3: Orders ===== */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />

      {/* ===== TAB 4: Vouchers (includes Gift feature) ===== */}
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Vouchers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />

      {/* ===== TAB 5: Chats with Badge ===== */}
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

      {/* ===== TAB 6: Profile ===== */}
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