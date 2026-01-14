// app/(tabs)/index.tsx - Admin Dashboard Fresh Market Theme

import { getAllOrders } from '@/firebase/orderService';
import { getAllProducts } from '@/firebase/productService';
import { getPendingReviews } from '@/services/reviewService';
import { getTotalUnreadCount } from '@/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { auth } from '@/config/firebase';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    todayOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });

  const [quickStats, setQuickStats] = useState({
    pendingReviews: 0,
    unreadMessages: 0,
    lowStock: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [orders, products] = await Promise.all([
        getAllOrders(),
        getAllProducts(),
      ]);
      
      const today = new Date().toDateString();
      const todayOrdersList = orders.filter(
        (order) => order.createdAt && order.createdAt.toDateString() === today
      );

      const completedOrders = orders.filter((o) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const pendingOrders = orders.filter((o) => o.status === 'pending').length;
      const lowStockProducts = products.filter((p: any) => p.stock < 10).length;

      setStats({
        totalProducts: products.length,
        totalRevenue,
        todayOrders: todayOrdersList.length,
        totalOrders: orders.length,
        pendingOrders,
      });

      // Quick stats
      const pendingReviews = await getPendingReviews();
      const unreadMessages = await getTotalUnreadCount();

      setQuickStats({
        pendingReviews: pendingReviews.length,
        unreadMessages,
        lowStock: lowStockProducts,
      });

      // Recent orders
      setRecentOrders(
        orders.slice(0, 5).map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.customerName || 'Khách lẻ',
          time: order.createdAt ? formatTime(order.createdAt) : '',
          total: order.total || 0,
          status: order.status,
          items: order.items?.length || 0,
        }))
      );
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      preparing: '#8B5CF6',
      delivering: '#06B6D4',
      completed: '#22C55E',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      delivering: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return texts[status] || status;
  };

  const totalAlerts = quickStats.pendingReviews + quickStats.unreadMessages + stats.pendingOrders + quickStats.lowStock;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
    >
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Xin chào! 👋</Text>
            <Text style={styles.userName}>{user?.displayName || 'Admin'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={24} color="white" />
            {totalAlerts > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalAlerts > 9 ? '9+' : totalAlerts}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
            <Text style={styles.revenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <View style={styles.revenueChange}>
              <Ionicons name="trending-up" size={16} color="#22C55E" />
              <Text style={styles.revenueChangeText}>+12.5% so với tháng trước</Text>
            </View>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="wallet" size={32} color="#22C55E" />
          </View>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/orders')}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="receipt" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{stats.todayOrders}</Text>
          <Text style={styles.statLabel}>Đơn hôm nay</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/orders')}>
          <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="time" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Chờ xử lý</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/products')}>
          <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="cube" size={24} color="#22C55E" />
          </View>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Sản phẩm</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/chats')}>
          <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="chatbubbles" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>{quickStats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Tin nhắn</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts Section */}
      {(stats.pendingOrders > 0 || quickStats.pendingReviews > 0 || quickStats.lowStock > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Cần xử lý ngay</Text>
          <View style={styles.alertsContainer}>
            {stats.pendingOrders > 0 && (
              <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/(tabs)/orders')}>
                <View style={[styles.alertIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertValue}>{stats.pendingOrders}</Text>
                  <Text style={styles.alertLabel}>Đơn chờ xác nhận</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            )}

            {quickStats.pendingReviews > 0 && (
              <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/reviews' as any)}>
                <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="star-half" size={20} color="#EF4444" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertValue}>{quickStats.pendingReviews}</Text>
                  <Text style={styles.alertLabel}>Đánh giá chờ duyệt</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            )}

            {quickStats.lowStock > 0 && (
              <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/(tabs)/products')}>
                <View style={[styles.alertIcon, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="warning" size={20} color="#F97316" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertValue}>{quickStats.lowStock}</Text>
                  <Text style={styles.alertLabel}>Sản phẩm sắp hết</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Thao tác nhanh</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/products/add')}>
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.actionGradient}>
              <Ionicons name="add-circle" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Thêm SP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/orders/create' as any)}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
              <Ionicons name="cart" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Tạo đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/vouchers')}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionGradient}>
              <Ionicons name="ticket" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Voucher</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/statistics' as any)}>
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionGradient}>
              <Ionicons name="stats-chart" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Thống kê</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📦 Đơn hàng gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        ) : (
          recentOrders.map((order, index) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.orderCard, index === recentOrders.length - 1 && { marginBottom: 0 }]}
              onPress={() => router.push(`/orders/${order.id}` as any)}
            >
              <View style={styles.orderLeft}>
                <View style={[styles.orderIcon, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                  <Ionicons name="receipt" size={20} color={getStatusColor(order.status)} />
                </View>
              </View>
              <View style={styles.orderCenter}>
                <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                <Text style={styles.orderCustomer}>{order.customer}</Text>
                <Text style={styles.orderTime}>{order.time} • {order.items} sản phẩm</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                <View style={[styles.orderStatus, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                  <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: {},
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  userName: { fontSize: 24, fontWeight: '700', color: 'white', marginTop: 2 },
  notificationBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '700' },

  revenueCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  revenueLeft: {},
  revenueLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  revenueValue: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  revenueChange: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  revenueChangeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  revenueIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: -40, gap: 12 },
  statCard: { width: (width - 52) / 2, backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  seeAll: { fontSize: 14, color: '#22C55E', fontWeight: '600' },

  alertsContainer: { gap: 10 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  alertIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  alertContent: { flex: 1 },
  alertValue: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  alertLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, alignItems: 'center' },
  actionGradient: { width: '100%', height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginTop: 8 },

  emptyCard: { backgroundColor: 'white', borderRadius: 16, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },

  orderCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  orderLeft: { marginRight: 12 },
  orderIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  orderCenter: { flex: 1 },
  orderNumber: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  orderCustomer: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  orderTime: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  orderRight: { alignItems: 'flex-end' },
  orderTotal: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
  orderStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  orderStatusText: { fontSize: 11, fontWeight: '600' },
});