// app/(tabs)/orders.tsx - Admin Orders Fresh Market Theme

import { getAllOrders, updateOrderStatus } from '@/firebase/orderService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { Order, OrderStatus } from '@/types/order';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

type FilterType = 'all' | OrderStatus;

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      showAlert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 24) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay';
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bg: string; icon: string; text: string }> = {
      pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time', text: 'Chờ xác nhận' },
      confirmed: { color: '#3B82F6', bg: '#DBEAFE', icon: 'checkmark-circle', text: 'Đã xác nhận' },
      preparing: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'restaurant', text: 'Đang chuẩn bị' },
      delivering: { color: '#06B6D4', bg: '#CFFAFE', icon: 'bicycle', text: 'Đang giao' },
      completed: { color: '#22C55E', bg: '#DCFCE7', icon: 'checkmark-done-circle', text: 'Hoàn thành' },
      cancelled: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle', text: 'Đã hủy' },
    };
    return config[status] || { color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle', text: status };
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      showAlert('Thành công', 'Đã cập nhật trạng thái đơn hàng');
      setShowStatusModal(false);
      loadOrders();
    } catch (error) {
      showAlert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => ['confirmed', 'preparing', 'delivering'].includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chờ xác nhận', count: stats.pending },
    { key: 'confirmed', label: 'Đã xác nhận', count: orders.filter((o) => o.status === 'confirmed').length },
    { key: 'preparing', label: 'Đang chuẩn bị', count: orders.filter((o) => o.status === 'preparing').length },
    { key: 'delivering', label: 'Đang giao', count: orders.filter((o) => o.status === 'delivering').length },
    { key: 'completed', label: 'Hoàn thành', count: stats.completed },
    { key: 'cancelled', label: 'Đã hủy', count: orders.filter((o) => o.status === 'cancelled').length },
  ];

  const renderOrder = ({ item }: { item: Order }) => {
    const status = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/orders/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberRow}>
            <View style={[styles.orderIcon, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon as any} size={18} color={status.color} />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: status.bg }]}
            onPress={() => { setSelectedOrder(item); setShowStatusModal(true); }}
          >
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            <Ionicons name="chevron-down" size={14} color={status.color} />
          </TouchableOpacity>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.customerRow}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.customerName}>{item.customerName}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.customerPhone}>{item.customerPhone}</Text>
          </View>
          {item.address && (
            <View style={styles.customerRow}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.customerAddress} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.itemsInfo}>
            <Text style={styles.itemsCount}>{item.items?.length || 0} sản phẩm</Text>
            {item.voucherCode && (
              <View style={styles.voucherTag}>
                <Ionicons name="ticket" size={12} color="#F97316" />
                <Text style={styles.voucherText}>{item.voucherCode}</Text>
              </View>
            )}
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng</Text>
            <Text style={styles.totalValue}>{formatCurrency(item.total)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
        <Text style={styles.headerSubtitle}>{stats.total} đơn hàng</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Chờ xử lý</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.processing}</Text>
            <Text style={styles.statLabel}>Đang xử lý</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
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
              style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
              {item.count > 0 && (
                <View style={[styles.filterBadge, filter === item.key && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filter === item.key && styles.filterBadgeTextActive]}>
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/orders/create' as any)}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Đơn hàng #{selectedOrder?.orderNumber}</Text>

            {(['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'] as OrderStatus[]).map((status) => {
              const config = getStatusConfig(status);
              const isActive = selectedOrder?.status === status;

              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, isActive && styles.statusOptionActive]}
                  onPress={() => selectedOrder && handleUpdateStatus(selectedOrder.id, status)}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                  </View>
                  <Text style={[styles.statusOptionText, isActive && { color: config.color, fontWeight: '700' }]}>
                    {config.text}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={24} color={config.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, marginTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: 'white' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  filterContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, gap: 6 },
  filterTabActive: { backgroundColor: '#22C55E' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: 'white' },
  filterBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  filterBadgeTextActive: { color: 'white' },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  orderDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  orderBody: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginBottom: 12, gap: 8 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  customerPhone: { fontSize: 14, color: '#6B7280' },
  customerAddress: { flex: 1, fontSize: 13, color: '#6B7280' },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  itemsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemsCount: { fontSize: 13, color: '#6B7280' },
  voucherTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  voucherText: { fontSize: 11, fontWeight: '600', color: '#F97316' },
  totalContainer: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#22C55E' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },

  fab: { position: 'absolute', bottom: 90, right: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabGradient: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  statusOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent' },
  statusOptionActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  statusOptionIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  statusOptionText: { flex: 1, fontSize: 15, color: '#4B5563' },
});