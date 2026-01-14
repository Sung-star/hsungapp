// app/client/notifications.tsx - Fixed Version

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  orderId?: string;
  createdAt: any;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (unreadCount > 0 && !loading) markAllAsRead();
  }, [loading]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return { name: 'receipt-outline', color: '#3B82F6', bg: '#DBEAFE' };
      case 'promotion': return { name: 'gift-outline', color: '#F59E0B', bg: '#FEF3C7' };
      default: return { name: 'notifications-outline', color: '#22C55E', bg: '#DCFCE7' };
    }
  };

  const formatTime = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return minutes + ' phút trước';
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return hours + ' giờ trước';
    return d.toLocaleDateString('vi-VN');
  };

  const handlePress = async (n: NotificationItem) => {
    if (!n.isRead) await markAsRead(n.id);
    if (n.type === 'order' && n.orderId) router.push('/client/order/' + n.orderId as any);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity style={[styles.card, !item.isRead && styles.unread]} onPress={() => handlePress(item)}>
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.isRead && { fontWeight: '700' }]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  const list = notifications as NotificationItem[];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22C55E" /></View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có thông báo</Text>
        </View>
      ) : (
        <FlatList data={list} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  unread: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  body: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 12, color: '#9CA3AF' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', position: 'absolute', top: 14, right: 14 },
});