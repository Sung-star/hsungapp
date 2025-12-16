import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    todayOrders: 0,
    totalCustomers: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);

  // Fake data
  useEffect(() => {
    setStats({
      totalProducts: 156,
      totalRevenue: 45678000,
      todayOrders: 23,
      totalCustomers: 89,
    });

    setRecentOrders([
      { id: '1', customer: 'Nguyễn Văn A', total: 450000, time: '10:30' },
      { id: '2', customer: 'Trần Thị B', total: 320000, time: '11:15' },
      { id: '3', customer: 'Lê Văn C', total: 890000, time: '12:00' },
    ]);
  }, []);

  // ❌ SAI: formatCurrency(amount: number)  (TypeScript)
  // ✔ ĐÚNG: formatCurrency(amount)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào!</Text>
            <Text style={styles.userName}>Admin</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color="white" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#667eea' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="cube-outline" size={24} color="white" />
          </View>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Sản phẩm</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#43A047' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="cash-outline" size={24} color="white" />
          </View>
          <Text style={styles.statValue}>
            {(stats.totalRevenue / 1_000_000).toFixed(1)}M
          </Text>
          <Text style={styles.statLabel}>Doanh thu</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="receipt-outline" size={24} color="white" />
          </View>
          <Text style={styles.statValue}>{stats.todayOrders}</Text>
          <Text style={styles.statLabel}>Đơn hôm nay</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FFA726' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="people-outline" size={24} color="white" />
          </View>
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Khách hàng</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>

        <View style={styles.actionsGrid}>
          <Link href="/products/add" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.actionGradient}
              >
                <Ionicons name="add-circle-outline" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Thêm sản phẩm</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/orders/create" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#43A047', '#66BB6A']}
                style={styles.actionGradient}
              >
                <Ionicons name="cart-outline" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Tạo đơn hàng</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/inventory" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.actionGradient}
              >
                <Ionicons name="file-tray-full-outline" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Nhập hàng</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/statistics" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#FFA726', '#FFB74D']}
                style={styles.actionGradient}
              >
                <Ionicons name="stats-chart-outline" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Thống kê</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
          <Link href="/orders" asChild>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {recentOrders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard}>
            <View style={styles.orderIcon}>
              <Ionicons name="receipt" size={24} color="#667eea" />
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderCustomer}>{order.customer}</Text>
              <Text style={styles.orderTime}>{order.time}</Text>
            </View>

            <Text style={styles.orderTotal}>
              {formatCurrency(order.total)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAll: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    alignItems: 'center',
  },
  actionGradient: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 13,
    color: '#999',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#43A047',
  },
});