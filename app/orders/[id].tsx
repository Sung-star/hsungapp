// app/orders/[id].tsx - Admin Order Detail - FIX NaN
// Copy file này vào app/orders/[id].tsx

import {
  deleteOrder,
  getOrder,
  updateOrderStatus
} from '@/firebase/orderService';
import { getPaymentByOrderId, updatePaymentStatus } from '@/services/paymentService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Order, OrderStatus } from '@/types/order';
import { Payment } from '@/types/payment';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

// Constants - đồng bộ với checkout
const FREE_SHIPPING_THRESHOLD = 200000;
const SHIPPING_FEE = 30000;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadOrderAndPayment = async () => {
      try {
        setLoading(true);
        const orderData = await getOrder(id as string);
        if (!orderData) {
          showAlert('Lỗi', 'Không tìm thấy đơn hàng');
          router.back();
          return;
        }
        setOrder(orderData);

        try {
          const paymentData = await getPaymentByOrderId(id as string);
          setPayment(paymentData);
        } catch (err) {
          console.log('No payment found for this order');
        }
      } catch (error) {
        console.error(error);
        showAlert('Lỗi', 'Không thể tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    loadOrderAndPayment();
  }, [id]);

  // ===== HELPER: Đảm bảo giá trị là số hợp lệ =====
  const safeNumber = (value: any, fallback: number = 0): number => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num) ? num : fallback;
  };

  const formatCurrency = (amount: number) => {
    const validAmount = safeNumber(amount, 0);
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(validAmount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    try {
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
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

  const getPaymentMethodText = (method: string): string => {
    const methodMap: Record<string, string> = {
      cash: 'Tiền mặt (COD)',
      transfer: 'Chuyển khoản ngân hàng',
      card: 'Thẻ tín dụng/ghi nợ',
      cod: 'Thanh toán khi nhận hàng',
      bank_transfer: 'Chuyển khoản ngân hàng',
      momo: 'Ví MoMo',
      vnpay: 'VNPay',
      zalopay: 'ZaloPay',
    };
    return methodMap[method] || method;
  };

  const getPaymentMethodIcon = (method: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      cash: 'cash-outline',
      transfer: 'business-outline',
      card: 'card-outline',
      cod: 'cash-outline',
      bank_transfer: 'business-outline',
      momo: 'wallet-outline',
      vnpay: 'qr-code-outline',
      zalopay: 'phone-portrait-outline',
    };
    return iconMap[method] || 'card-outline';
  };

  const getPaymentStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#FFA726',
      processing: '#42A5F5',
      success: '#66BB6A',
      failed: '#EF5350',
      cancelled: '#9E9E9E',
    };
    return colorMap[status] || '#999';
  };

  const getPaymentStatusText = (status: string): string => {
    const textMap: Record<string, string> = {
      pending: 'Chờ thanh toán',
      processing: 'Đang xử lý',
      success: 'Đã thanh toán',
      failed: 'Thất bại',
      cancelled: 'Đã hủy',
    };
    return textMap[status] || status;
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    const statusText = getStatusText(newStatus);
    showConfirmDialog(
      'Xác nhận',
      `Bạn có chắc muốn chuyển trạng thái sang "${statusText}"?`,
      async () => {
        setUpdating(true);
        try {
          await updateOrderStatus(id as string, newStatus);
          setOrder({ ...order, status: newStatus });
          showAlert('Thành công', 'Đã cập nhật trạng thái');
        } catch (error) {
          console.error(error);
          showAlert('Lỗi', 'Không thể cập nhật trạng thái');
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  const handleConfirmPayment = async () => {
    if (!payment) return;
    showConfirmDialog(
      'Xác nhận thanh toán',
      'Bạn xác nhận đã nhận được tiền từ khách hàng?',
      async () => {
        setUpdating(true);
        try {
          await updatePaymentStatus(payment.id!, 'success');
          setPayment({ ...payment, status: 'success' });
          showAlert('Thành công', 'Đã xác nhận thanh toán');
        } catch (error) {
          console.error(error);
          showAlert('Lỗi', 'Không thể xác nhận thanh toán');
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  const handleRejectPayment = async () => {
    if (!payment) return;
    showConfirmDialog(
      'Từ chối thanh toán',
      'Bạn xác nhận từ chối thanh toán này?',
      async () => {
        setUpdating(true);
        try {
          await updatePaymentStatus(payment.id!, 'failed');
          setPayment({ ...payment, status: 'failed' });
          showAlert('Thành công', 'Đã từ chối thanh toán');
        } catch (error) {
          console.error(error);
          showAlert('Lỗi', 'Không thể từ chối thanh toán');
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  const handleDelete = () => {
    showConfirmDialog(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa đơn hàng "${order?.orderNumber}"?`,
      async () => {
        setUpdating(true);
        try {
          await deleteOrder(id as string);
          showAlert('Thành công', 'Đã xóa đơn hàng');
          router.replace('/(tabs)/orders');
        } catch (error) {
          console.error(error);
          showAlert('Lỗi', 'Không thể xóa đơn hàng');
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  const handleCallCustomer = () => {
    if (order?.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Không tìm thấy đơn hàng</Text>
      </View>
    );
  }

  const orderStatus = String(order.status);
  
  // ===== FIX NaN: Sử dụng safeNumber để đảm bảo tất cả giá trị là số hợp lệ =====
  const subtotal = safeNumber(order.subtotal, order.items.reduce((sum, item) => sum + safeNumber(item.total, 0), 0));
  const shippingFee = safeNumber(order.shipping, subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
  const discount = safeNumber(order.discount, 0);
  const total = safeNumber(order.total, subtotal + shippingFee - discount);

  return (
    <View style={styles.container}>
      {updating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingOverlayText}>Đang xử lý...</Text>
        </View>
      )}

      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <TouchableOpacity style={styles.backBtn} onPress={handleCallCustomer}>
            <Ionicons name="call" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(orderStatus)}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(orderStatus) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(orderStatus) }]}>
                {getStatusText(orderStatus)}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="person" size={18} color="#667eea" />
            </View>
            <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Họ tên:</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>SĐT:</Text>
              <TouchableOpacity onPress={handleCallCustomer} style={styles.phoneContainer}>
                <Text style={styles.phoneValue}>{order.customerPhone}</Text>
                <Ionicons name="call" size={14} color="#667eea" />
              </TouchableOpacity>
            </View>
            {order.customerId && (
              <View style={styles.infoRow}>
                <Ionicons name="finger-print-outline" size={18} color="#666" />
                <Text style={styles.infoLabel}>User ID:</Text>
                <Text style={[styles.infoValue, { fontSize: 11 }]} numberOfLines={1}>
                  {order.customerId}
                </Text>
              </View>
            )}
            {order.address && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.infoLabel}>Địa chỉ:</Text>
                <Text style={styles.addressValue}>{order.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Products */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="cart" size={18} color="#667eea" />
            </View>
            <Text style={styles.cardTitle}>Sản phẩm đặt mua</Text>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{order.items.length}</Text>
            </View>
          </View>
          {order.items.map((item, index) => (
            <View key={index} style={[styles.productItem, index === order.items.length - 1 && styles.productItemLast]}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.productImagePlaceholder]}>
                  <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                  <Text style={styles.productQty}>x{item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.productTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="card" size={18} color="#667eea" />
            </View>
            <Text style={styles.cardTitle}>Thanh toán</Text>
          </View>

          <View style={styles.paymentMethodBox}>
            <View style={styles.paymentMethodIcon}>
              <Ionicons name={getPaymentMethodIcon(order.paymentMethod)} size={24} color="#667eea" />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodLabel}>Phương thức</Text>
              <Text style={styles.paymentMethodValue}>{getPaymentMethodText(order.paymentMethod)}</Text>
            </View>
          </View>

          {payment && (
            <View style={styles.paymentStatusBox}>
              <View style={styles.paymentStatusHeader}>
                <Text style={styles.paymentStatusLabel}>Trạng thái thanh toán</Text>
                <View style={[styles.paymentStatusBadge, { backgroundColor: `${getPaymentStatusColor(payment.status)}15` }]}>
                  <View style={[styles.paymentStatusDot, { backgroundColor: getPaymentStatusColor(payment.status) }]} />
                  <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(payment.status) }]}>
                    {getPaymentStatusText(payment.status)}
                  </Text>
                </View>
              </View>
              {payment.transactionId && (
                <View style={styles.transactionRow}>
                  <Text style={styles.transactionLabel}>Mã GD:</Text>
                  <Text style={styles.transactionValue}>{payment.transactionId}</Text>
                </View>
              )}
              {payment.paidAt && (
                <View style={styles.transactionRow}>
                  <Text style={styles.transactionLabel}>Thanh toán lúc:</Text>
                  <Text style={styles.transactionValue}>{formatDate(payment.paidAt)}</Text>
                </View>
              )}
              {payment.status === 'pending' && (
                <View style={styles.paymentActions}>
                  <TouchableOpacity style={styles.confirmPaymentBtn} onPress={handleConfirmPayment} disabled={updating}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.confirmPaymentText}>Xác nhận đã nhận tiền</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectPaymentBtn} onPress={handleRejectPayment} disabled={updating}>
                    <Ionicons name="close-circle" size={18} color="#EF5350" />
                    <Text style={styles.rejectPaymentText}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.shippingLabelContainer}>
                <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                {shippingFee === 0 && subtotal >= FREE_SHIPPING_THRESHOLD && (
                  <View style={styles.freeShipBadge}>
                    <Text style={styles.freeShipText}>Miễn phí</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.summaryValue, shippingFee === 0 && styles.freeShipValue]}>
                {shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.discountLabelContainer}>
                  <Text style={styles.summaryLabel}>Giảm giá</Text>
                  {order.voucherCode && (
                    <View style={styles.voucherBadge}>
                      <Text style={styles.voucherCodeText}>{order.voucherCode}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.discountValue}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Voucher */}
        {order.voucherCode && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="pricetag" size={18} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Mã giảm giá</Text>
            </View>
            <View style={styles.voucherInfoBox}>
              <View style={styles.voucherIconContainer}>
                <Ionicons name="ticket" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.voucherDetails}>
                <Text style={styles.voucherCodeLarge}>{order.voucherCode}</Text>
                <Text style={styles.voucherDiscount}>Giảm {formatCurrency(discount)}</Text>
              </View>
              <View style={styles.voucherApplied}>
                <Ionicons name="checkmark-circle" size={20} color="#66BB6A" />
                <Text style={styles.voucherAppliedText}>Đã áp dụng</Text>
              </View>
            </View>
          </View>
        )}

        {/* Note */}
        {order.note && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="document-text" size={18} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Ghi chú từ khách</Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{order.note}</Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="time" size={18} color="#667eea" />
            </View>
            <Text style={styles.cardTitle}>Lịch sử đơn hàng</Text>
          </View>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Đơn hàng được tạo</Text>
                <Text style={styles.timelineDate}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>
            {payment?.paidAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: '#66BB6A' }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Đã thanh toán</Text>
                  <Text style={styles.timelineDate}>{formatDate(payment.paidAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {orderStatus === 'pending' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleUpdateStatus('confirmed')} disabled={updating}>
              <LinearGradient colors={['#42A5F5', '#64B5F6']} style={styles.actionGradient}>
                <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                <Text style={styles.actionText}>Xác nhận đơn</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleUpdateStatus('cancelled')} disabled={updating}>
              <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.actionGradient}>
                <Ionicons name="close-circle-outline" size={24} color="white" />
                <Text style={styles.actionText}>Hủy đơn</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {orderStatus === 'confirmed' && (
          <TouchableOpacity style={[styles.actionButtonFull, { marginHorizontal: 16, marginTop: 16 }]} onPress={() => handleUpdateStatus('preparing')} disabled={updating}>
            <LinearGradient colors={['#AB47BC', '#BA68C8']} style={styles.actionGradientFull}>
              <Ionicons name="restaurant-outline" size={24} color="white" />
              <Text style={styles.actionText}>Bắt đầu chuẩn bị</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {orderStatus === 'preparing' && (
          <TouchableOpacity style={[styles.actionButtonFull, { marginHorizontal: 16, marginTop: 16 }]} onPress={() => handleUpdateStatus('delivering')} disabled={updating}>
            <LinearGradient colors={['#5C6BC0', '#7986CB']} style={styles.actionGradientFull}>
              <Ionicons name="bicycle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Bắt đầu giao hàng</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {orderStatus === 'delivering' && (
          <TouchableOpacity style={[styles.actionButtonFull, { marginHorizontal: 16, marginTop: 16 }]} onPress={() => handleUpdateStatus('completed')} disabled={updating}>
            <LinearGradient colors={['#43A047', '#66BB6A']} style={styles.actionGradientFull}>
              <Ionicons name="checkmark-done-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Hoàn thành đơn hàng</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.deleteButton, updating && styles.deleteButtonDisabled]} onPress={handleDelete} disabled={updating}>
          <Ionicons name="trash-outline" size={20} color={updating ? '#ccc' : '#FF6B6B'} />
          <Text style={[styles.deleteText, updating && { color: '#ccc' }]}>Xóa đơn hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingOverlayText: { marginTop: 12, fontSize: 14, color: '#667eea', fontWeight: '500' },
  header: { paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  content: { flex: 1 },
  card: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderHeaderLeft: { flex: 1 },
  orderNumber: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  orderDate: { fontSize: 13, color: '#999' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  itemCountBadge: { backgroundColor: '#667eea', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  itemCountText: { color: 'white', fontSize: 12, fontWeight: '600' },
  customerInfo: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, color: '#666', width: 70 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  phoneContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneValue: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addressValue: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  productItemLast: { borderBottomWidth: 0 },
  productImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#f5f5f5' },
  productImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 6, lineHeight: 18 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productPrice: { fontSize: 13, color: '#666' },
  productQty: { fontSize: 13, color: '#999', backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  productTotal: { fontSize: 15, fontWeight: '700', color: '#667eea' },
  paymentMethodBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', padding: 14, borderRadius: 12, marginBottom: 12 },
  paymentMethodIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#667eea', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  paymentMethodInfo: { flex: 1 },
  paymentMethodLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  paymentMethodValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  paymentStatusBox: { backgroundColor: '#FAFAFA', padding: 14, borderRadius: 12, marginBottom: 12 },
  paymentStatusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paymentStatusLabel: { fontSize: 13, color: '#666' },
  paymentStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  paymentStatusDot: { width: 6, height: 6, borderRadius: 3 },
  paymentStatusText: { fontSize: 12, fontWeight: '600' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  transactionLabel: { fontSize: 13, color: '#999', width: 100 },
  transactionValue: { flex: 1, fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  paymentActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  confirmPaymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#66BB6A', paddingVertical: 10, borderRadius: 10, gap: 6 },
  confirmPaymentText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rejectPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 6 },
  rejectPaymentText: { color: '#EF5350', fontSize: 13, fontWeight: '600' },
  summarySection: { marginTop: 4 },
  summaryDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  shippingLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freeShipBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  freeShipText: { fontSize: 10, color: '#43A047', fontWeight: '600' },
  freeShipValue: { color: '#43A047' },
  discountLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voucherBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  voucherCodeText: { fontSize: 10, color: '#FF6B6B', fontWeight: '600' },
  discountValue: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },
  totalDivider: { height: 1, backgroundColor: '#667eea', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#667eea' },
  voucherInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2', borderStyle: 'dashed' },
  voucherIconContainer: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  voucherDetails: { flex: 1 },
  voucherCodeLarge: { fontSize: 16, fontWeight: '700', color: '#FF6B6B', marginBottom: 2 },
  voucherDiscount: { fontSize: 13, color: '#666' },
  voucherApplied: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voucherAppliedText: { fontSize: 12, color: '#66BB6A', fontWeight: '500' },
  noteBox: { backgroundColor: '#FFFBF0', padding: 14, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#FFB74D' },
  noteText: { fontSize: 14, color: '#666', lineHeight: 20, fontStyle: 'italic' },
  timeline: { paddingLeft: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E0E0E0', marginRight: 12, marginTop: 4 },
  timelineDotActive: { backgroundColor: '#667eea' },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  timelineDate: { fontSize: 12, color: '#999' },
  actionsCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 12 },
  actionButton: { flex: 1, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  actionButtonFull: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  actionGradient: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  actionGradientFull: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionText: { fontSize: 14, fontWeight: '700', color: 'white' },
  footer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' },
  deleteButtonDisabled: { borderColor: '#E0E0E0', backgroundColor: '#FAFAFA' },
  deleteText: { fontSize: 15, fontWeight: '600', color: '#FF6B6B' },
});