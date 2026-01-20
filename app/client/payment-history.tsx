// app/client/payment-history.tsx - User Payment History Screen

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';
import { getUserPayments } from '@/services/paymentService';
import {
  Payment,
  PaymentStatus,
  getPaymentMethodName,
  getPaymentStatusName,
  getPaymentStatusColor,
  getPaymentMethodIcon,
} from '@/types/payment';

type FilterType = 'all' | PaymentStatus;

export default function PaymentHistoryScreen() {
  const user = auth.currentUser;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadPayments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserPayments(user.uid);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) {
      const mins = Math.floor(diff / 60000);
      return `${mins} phút trước`;
    }
    if (hours < 24) {
      return `${hours} giờ trước`;
    }
    if (days < 7) {
      return `${days} ngày trước`;
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getStatusIcon = (status: PaymentStatus) => {
    const icons: Record<PaymentStatus, string> = {
      pending: 'time',
      processing: 'sync',
      success: 'checkmark-circle',
      failed: 'close-circle',
      cancelled: 'ban',
    };
    return icons[status] || 'help-circle';
  };

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    success: payments.filter((p) => p.status === 'success').length,
    totalAmount: payments
      .filter((p) => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'success', label: 'Thành công' },
    { key: 'failed', label: 'Thất bại' },
  ];

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const statusColor = getPaymentStatusColor(item.status);
    const methodIcon = getPaymentMethodIcon(item.method);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.paymentCard}
        onPress={() => {
          setSelectedPayment(item);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${statusColor}15` }]}>
              <Ionicons name={statusIcon as any} size={24} color={statusColor} />
            </View>
            <View>
              <Text style={styles.orderNumber}>Đơn #{item.orderNumber}</Text>
              <Text style={styles.paymentDate}>{formatShortDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getPaymentStatusName(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.methodRow}>
            <Ionicons name={methodIcon as any} size={16} color="#6B7280" />
            <Text style={styles.methodText}>{getPaymentMethodName(item.method)}</Text>
          </View>
          {item.transactionId && (
            <Text style={styles.transactionId}>Mã GD: {item.transactionId}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountLabel}>Số tiền</Text>
          <Text style={[styles.amountValue, { color: statusColor }]}>
            {item.status === 'success' ? '+' : ''}{formatCurrency(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lịch sử thanh toán</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="person-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Chưa đăng nhập</Text>
          <Text style={styles.emptyText}>Vui lòng đăng nhập để xem lịch sử thanh toán</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth/login' as any)}
          >
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch sử thanh toán</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng GD</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.success}</Text>
            <Text style={styles.statLabel}>Thành công</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalAmount).replace('đ', '')}</Text>
            <Text style={styles.statLabel}>Đã thanh toán</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter */}
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
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Payments List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Bạn chưa có giao dịch thanh toán nào'
                : `Không có giao dịch ${getPaymentStatusName(filter as PaymentStatus).toLowerCase()}`}
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => router.push('/client/products' as any)}
            >
              <Text style={styles.shopBtnText}>Mua sắm ngay</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Payment Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <View style={styles.detailContent}>
                {/* Status Icon */}
                <View style={styles.detailStatusContainer}>
                  <View
                    style={[
                      styles.detailStatusIcon,
                      { backgroundColor: `${getPaymentStatusColor(selectedPayment.status)}15` },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(selectedPayment.status) as any}
                      size={48}
                      color={getPaymentStatusColor(selectedPayment.status)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.detailStatusText,
                      { color: getPaymentStatusColor(selectedPayment.status) },
                    ]}
                  >
                    {getPaymentStatusName(selectedPayment.status)}
                  </Text>
                  <Text style={styles.detailAmount}>{formatCurrency(selectedPayment.amount)}</Text>
                </View>

                {/* QR Code Preview */}
                {selectedPayment.qrCodeUrl && selectedPayment.status === 'pending' && (
                  <View style={styles.qrPreview}>
                    <Image
                      source={{ uri: selectedPayment.qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrHint}>Quét mã để thanh toán</Text>
                  </View>
                )}

                {/* Details */}
                <View style={styles.detailRows}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã đơn hàng</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDetailModal(false);
                        router.push(`/client/order/${selectedPayment.orderId}` as any);
                      }}
                    >
                      <Text style={[styles.detailValue, styles.linkText]}>
                        #{selectedPayment.orderNumber}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã giao dịch</Text>
                    <Text style={styles.detailValueMono}>{selectedPayment.transactionId}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phương thức</Text>
                    <View style={styles.methodBadge}>
                      <Ionicons
                        name={getPaymentMethodIcon(selectedPayment.method) as any}
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.detailValue}>
                        {getPaymentMethodName(selectedPayment.method)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời gian tạo</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedPayment.createdAt)}</Text>
                  </View>

                  {selectedPayment.paidAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Thời gian thanh toán</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPayment.paidAt)}</Text>
                    </View>
                  )}

                  {/* Bank Info */}
                  {selectedPayment.method === 'bank_transfer' && selectedPayment.bankInfo && (
                    <>
                      <View style={styles.sectionDivider} />
                      <Text style={styles.sectionTitle}>Thông tin chuyển khoản</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Ngân hàng</Text>
                        <Text style={styles.detailValue}>{selectedPayment.bankInfo.bankName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Số tài khoản</Text>
                        <Text style={styles.detailValueMono}>
                          {selectedPayment.bankInfo.accountNumber}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nội dung CK</Text>
                        <Text style={styles.detailValueMono}>{selectedPayment.bankInfo.content}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* View Order Button */}
                <TouchableOpacity
                  style={styles.viewOrderBtn}
                  onPress={() => {
                    setShowDetailModal(false);
                    router.push(`/client/order/${selectedPayment.orderId}` as any);
                  }}
                >
                  <Ionicons name="receipt-outline" size={20} color="#22C55E" />
                  <Text style={styles.viewOrderBtnText}>Xem đơn hàng</Text>
                </TouchableOpacity>
              </View>
            )}
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

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: 'white' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  filterContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterTabActive: { backgroundColor: '#22C55E' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: 'white' },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  paymentDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600' },

  cardBody: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 12 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodText: { fontSize: 14, color: '#6B7280' },
  transactionId: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  amountLabel: { fontSize: 13, color: '#6B7280' },
  amountValue: { fontSize: 20, fontWeight: '700' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  loginBtn: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },
  shopBtn: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  shopBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  detailContent: {},
  detailStatusContainer: { alignItems: 'center', marginBottom: 24 },
  detailStatusIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailStatusText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  detailAmount: { fontSize: 32, fontWeight: '800', color: '#1F2937' },

  qrPreview: { alignItems: 'center', marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 16 },
  qrImage: { width: 150, height: 150, borderRadius: 12 },
  qrHint: { fontSize: 13, color: '#6B7280', marginTop: 12 },

  detailRows: {},
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  detailValueMono: { fontSize: 14, fontWeight: '600', color: '#1F2937', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  linkText: { color: '#22C55E' },
  methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  sectionDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },

  viewOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    marginTop: 20,
  },
  viewOrderBtnText: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
});