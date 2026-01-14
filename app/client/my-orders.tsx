// app/client/my-orders.tsx - Updated with shipping field support
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCustomerOrders } from '@/firebase/orderService';
import { auth } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { Order, OrderStatus } from '@/types/order';

type FilterType = 'all' | OrderStatus;

export default function MyOrdersScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const orderList = await getCustomerOrders(user.uid);
      setOrders(orderList);
    } catch (err) {
      console.error('Error loading orders:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    try {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colorMap: Record<OrderStatus, string> = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      preparing: '#8B5CF6',
      delivering: '#06B6D4',
      completed: '#22C55E',
      cancelled: '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  const getStatusText = (status: OrderStatus): string => {
    const textMap: Record<OrderStatus, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      delivering: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return textMap[status] || String(status);
  };

  const getStatusIcon = (status: OrderStatus) => {
    const iconMap: Record<OrderStatus, any> = {
      pending: 'time-outline',
      confirmed: 'checkmark-circle-outline',
      preparing: 'restaurant-outline',
      delivering: 'bicycle-outline',
      completed: 'checkmark-done-circle-outline',
      cancelled: 'close-circle-outline',
    };
    return iconMap[status] || 'help-circle-outline';
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const renderOrderItem = ({ item }: { item: Order }) => {
    const orderStatus = String(item.status) as OrderStatus;
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/client/order/${item.id}`)}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber || 'N/A'}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderStatus) }]}>
            <Ionicons name={getStatusIcon(orderStatus)} size={14} color="white" />
            <Text style={styles.statusText}>{getStatusText(orderStatus)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.orderContent}>
          <View style={styles.itemsPreview}>
            <Ionicons name="cube-outline" size={18} color="#6B7280" />
            <Text style={styles.itemsText}>{item.items?.length || 0} sản phẩm</Text>
          </View>

          {item.voucherCode && (
            <View style={styles.voucherBadge}>
              <Ionicons name="ticket" size={14} color="#F97316" />
              <Text style={styles.voucherText}>{item.voucherCode}</Text>
            </View>
          )}

          <View style={styles.orderFooter}>
            <View>
              <Text style={styles.totalLabel}>Tổng tiền</Text>
              <Text style={styles.totalAmount}>{formatCurrency(item.total || 0)}</Text>
            </View>
            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={18} color="#22C55E" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterButtons}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterButton, filter === item.key && styles.filterButtonActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterButtonText, filter === item.key && styles.filterButtonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      ) : !user ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Chưa đăng nhập</Text>
          <Text style={styles.emptyText}>Vui lòng đăng nhập để xem đơn hàng của bạn</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.shopButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'Bạn chưa có đơn hàng nào' : `Không có đơn hàng ${getStatusText(filter as OrderStatus).toLowerCase()}`}
          </Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/client/products')}>
            <Text style={styles.shopButtonText}>Mua sắm ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  
  filterContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterButtonActive: { backgroundColor: '#22C55E' },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterButtonTextActive: { color: 'white' },
  
  listContent: { padding: 16 },
  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  orderDate: { fontSize: 13, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600', color: 'white' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },
  orderContent: { gap: 10 },
  itemsPreview: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemsText: { fontSize: 14, color: '#6B7280' },
  voucherBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  voucherText: { fontSize: 12, fontWeight: '600', color: '#F97316' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#22C55E' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewButtonText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  shopButton: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  shopButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },
});