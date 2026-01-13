// app/(tabs)/orders.tsx
import { getAllOrders } from '@/firebase/orderService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Order, OrderStatus } from '@/types/order';

type FilterType = 'all' | OrderStatus;

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders();
      console.log('✅ Admin orders loaded:', data.length);
      setOrders(data);
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    try {
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#FFA726',
      confirmed: '#42A5F5',
      preparing: '#AB47BC',
      delivering: '#5C6BC0',
      completed: '#66BB6A',
      cancelled: '#EF5350',
    };
    return colorMap[status] || '#999';
  };

  const getStatusText = (status: string): string => {
    const textMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      delivering: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return textMap[status] || String(status);
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const renderOrder = ({ item }: { item: Order }) => {
    // Force convert status to string
    const orderStatus = String(item.status);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          if (!item.id) return;
          router.push(`/orders/${item.id}`);
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberContainer}>
            <Ionicons name="receipt-outline" size={20} color="#667eea" />
            <Text style={styles.orderNumber}>{item.orderNumber || 'N/A'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(orderStatus)}20` },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(orderStatus) },
              ]}
            >
              {getStatusText(orderStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.customerName}>{item.customerName || 'N/A'}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.customerPhone}>{item.customerPhone || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.itemsCount}>
              {item.items?.length || 0} sản phẩm
            </Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.orderTotal}>{formatCurrency(item.total || 0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'preparing', label: 'Đang chuẩn bị' },
    { key: 'delivering', label: 'Đang giao' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <Text style={styles.headerSubtitle}>{filteredOrders.length} đơn</Text>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterButtons}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === item.key && styles.filterTabActive,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item, index) => item.id ?? index.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có đơn hàng</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/orders/create')}
      >
        <LinearGradient
          colors={['#43A047', '#66BB6A']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: 'white', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  filterContainer: { backgroundColor: 'white', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f5f6fa', marginRight: 8 },
  filterTabActive: { backgroundColor: '#667eea' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
  filterTextActive: { color: 'white' },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumberContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderBody: { marginBottom: 12, gap: 6 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  customerPhone: { fontSize: 14, color: '#666' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  itemsCount: { fontSize: 13, color: '#666', marginBottom: 2 },
  orderDate: { fontSize: 12, color: '#999' },
  orderTotal: { fontSize: 18, fontWeight: '700', color: '#43A047' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  fabButton: { position: 'absolute', bottom: 24, right: 24, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
});