// app/(tabs)/payments.tsx - Admin Payment Management Dashboard

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
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getAllPayments,
  adminConfirmPayment,
  adminRejectPayment,
  countPaymentsByStatus,
  calculateTotalRevenue,
} from '@/services/paymentService';
import { updateOrderStatus } from '@/firebase/orderService';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  getPaymentMethodName,
  getPaymentStatusName,
  getPaymentStatusColor,
  getPaymentMethodIcon,
} from '@/types/payment';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

type FilterType = 'all' | PaymentStatus;

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    success: 0,
    failed: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, statusCounts, revenue] = await Promise.all([
        getAllPayments(),
        countPaymentsByStatus(),
        calculateTotalRevenue(),
      ]);

      setPayments(paymentsData);
      setStats({
        total: paymentsData.length,
        pending: statusCounts.pending,
        success: statusCounts.success,
        failed: statusCounts.failed + statusCounts.cancelled,
        revenue,
      });
    } catch (error) {
      console.error('Error loading payments:', error);
      showAlert('Lỗi', 'Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

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

    if (hours < 1) {
      const mins = Math.floor(diff / 60000);
      return `${mins} phút trước`;
    }
    if (hours < 24) {
      return `${hours} giờ trước`;
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      const success = await adminConfirmPayment(selectedPayment.id!, 'Đã xác nhận bởi admin');
      if (success) {
        // Cập nhật trạng thái đơn hàng sang confirmed
        await updateOrderStatus(selectedPayment.orderId, 'confirmed');
        showAlert('Thành công', 'Đã xác nhận thanh toán');
        setShowConfirmModal(false);
        setShowDetailModal(false);
        loadData();
      } else {
        showAlert('Lỗi', 'Không thể xác nhận thanh toán');
      }
    } catch (error) {
      showAlert('Lỗi', 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      const success = await adminRejectPayment(
        selectedPayment.id!,
        rejectReason || 'Không xác nhận được giao dịch'
      );
      if (success) {
        showAlert('Đã từ chối', 'Đã từ chối thanh toán');
        setShowRejectModal(false);
        setShowDetailModal(false);
        setRejectReason('');
        loadData();
      } else {
        showAlert('Lỗi', 'Không thể từ chối thanh toán');
      }
    } catch (error) {
      showAlert('Lỗi', 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chờ xác nhận', count: stats.pending },
    { key: 'success', label: 'Thành công', count: stats.success },
    { key: 'failed', label: 'Thất bại', count: stats.failed },
  ];

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const statusColor = getPaymentStatusColor(item.status);
    const methodIcon = getPaymentMethodIcon(item.method);

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
            <View style={[styles.methodIconContainer, { backgroundColor: `${statusColor}15` }]}>
              <Ionicons name={methodIcon as any} size={20} color={statusColor} />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.transactionId}>{item.transactionId}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getPaymentStatusName(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phương thức</Text>
            <Text style={styles.infoValue}>{getPaymentMethodName(item.method)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian</Text>
            <Text style={styles.infoValue}>{formatShortDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountLabel}>Số tiền</Text>
          <Text style={[styles.amountValue, { color: statusColor }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.quickConfirmBtn}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPayment(item);
                setShowConfirmModal(true);
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={styles.quickConfirmText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickRejectBtn}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPayment(item);
                setShowRejectModal(true);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={styles.quickRejectText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải thanh toán...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý thanh toán</Text>
        <Text style={styles.headerSubtitle}>{stats.total} giao dịch</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Chờ xác nhận</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.success}</Text>
            <Text style={styles.statLabel}>Thành công</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(stats.revenue).replace('đ', '')}</Text>
            <Text style={styles.statLabel}>Doanh thu</Text>
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
              {item.count > 0 && (
                <View style={[styles.filterBadge, filter === item.key && styles.filterBadgeActive]}>
                  <Text
                    style={[styles.filterBadgeText, filter === item.key && styles.filterBadgeTextActive]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
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
            <Ionicons name="card-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          </View>
        }
      />

      {/* Payment Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết thanh toán</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <View style={styles.detailContent}>
                {/* QR Code Preview */}
                {selectedPayment.qrCodeUrl && (
                  <View style={styles.qrPreview}>
                    <Image
                      source={{ uri: selectedPayment.qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã đơn hàng</Text>
                  <Text style={styles.detailValue}>#{selectedPayment.orderNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã giao dịch</Text>
                  <Text style={styles.detailValueMono}>{selectedPayment.transactionId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phương thức</Text>
                  <Text style={styles.detailValue}>{getPaymentMethodName(selectedPayment.method)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tiền</Text>
                  <Text style={[styles.detailValue, styles.detailAmount]}>
                    {formatCurrency(selectedPayment.amount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <View
                    style={[
                      styles.detailStatusBadge,
                      { backgroundColor: `${getPaymentStatusColor(selectedPayment.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailStatusText,
                        { color: getPaymentStatusColor(selectedPayment.status) },
                      ]}
                    >
                      {getPaymentStatusName(selectedPayment.status)}
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
                  <View style={styles.bankInfoSection}>
                    <Text style={styles.bankInfoSectionTitle}>Thông tin chuyển khoản</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngân hàng</Text>
                      <Text style={styles.detailValue}>{selectedPayment.bankInfo.bankName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số tài khoản</Text>
                      <Text style={styles.detailValueMono}>{selectedPayment.bankInfo.accountNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Nội dung CK</Text>
                      <Text style={styles.detailValueMono}>{selectedPayment.bankInfo.content}</Text>
                    </View>
                  </View>
                )}

                {/* Actions for pending payments */}
                {selectedPayment.status === 'pending' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => setShowConfirmModal(true)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.confirmBtnText}>Xác nhận thanh toán</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => setShowRejectModal(true)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#22C55E" />
            </View>
            <Text style={styles.confirmModalTitle}>Xác nhận thanh toán?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Bạn xác nhận đã nhận được {formatCurrency(selectedPayment?.amount || 0)} từ đơn hàng #
              {selectedPayment?.orderNumber}
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalConfirmBtn, processing && styles.btnDisabled]}
                onPress={handleConfirmPayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmModalConfirmText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={[styles.confirmIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={60} color="#EF4444" />
            </View>
            <Text style={styles.confirmModalTitle}>Từ chối thanh toán?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Đơn hàng #{selectedPayment?.orderNumber}
            </Text>
            <TextInput
              style={styles.rejectReasonInput}
              placeholder="Nhập lý do từ chối (tùy chọn)"
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancelBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.confirmModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalConfirmBtn, processing && styles.btnDisabled]}
                onPress={handleRejectPayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmModalConfirmText}>Từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: 'white' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  filterContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  filterTabActive: { backgroundColor: '#22C55E' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: 'white' },
  filterBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  filterBadgeTextActive: { color: 'white' },

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
  methodIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  transactionId: { fontSize: 12, color: '#6B7280', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  cardBody: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginBottom: 12, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1F2937' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  amountLabel: { fontSize: 13, color: '#6B7280' },
  amountValue: { fontSize: 20, fontWeight: '700' },

  pendingActions: { flexDirection: 'row', gap: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  quickConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#DCFCE7', borderRadius: 10 },
  quickConfirmText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  quickRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#FEE2E2', borderRadius: 10 },
  quickRejectText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  detailContent: { gap: 4 },
  qrPreview: { alignItems: 'center', marginBottom: 16 },
  qrImage: { width: 150, height: 150, borderRadius: 12, backgroundColor: '#F9FAFB' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  detailValueMono: { fontSize: 14, fontWeight: '600', color: '#1F2937', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detailAmount: { fontSize: 18, color: '#22C55E' },
  detailStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  detailStatusText: { fontSize: 13, fontWeight: '600' },

  bankInfoSection: { marginTop: 16, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12 },
  bankInfoSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  detailActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#22C55E', borderRadius: 12 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#FEE2E2', borderRadius: 12 },
  rejectBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  // Confirm/Reject Modal
  confirmModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  confirmIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmModalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  confirmModalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  confirmModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmModalCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  confirmModalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center' },
  rejectModalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  confirmModalConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },

  rejectReasonInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
});