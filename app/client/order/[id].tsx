// app/client/order/[id].tsx - Updated with shipping field
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getOrder } from '@/firebase/orderService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Order } from '@/types/order';

export default function ClientOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const data = await getOrder(id as string);
        if (!data) {
          Alert.alert('Lỗi', 'Không tìm thấy đơn hàng', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setOrder(data);
      } catch (err) {
        console.error('Error loading order:', err);
        Alert.alert('Lỗi', 'Không thể tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadOrder();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản',
      card: 'Thẻ',
    };
    return methodMap[method] || method;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      preparing: '#8B5CF6',
      delivering: '#06B6D4',
      completed: '#22C55E',
      cancelled: '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
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
  const shippingFee = order.shipping || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Info Card */}
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderStatus) }]}>
              <Text style={styles.statusText}>{getStatusText(orderStatus)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color="#22C55E" />
            <Text style={styles.cardTitle}>Thông tin người nhận</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{order.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{order.customerPhone}</Text>
          </View>
          {order.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#6B7280" />
              <Text style={styles.infoLabel}>Địa chỉ:</Text>
              <Text style={styles.infoValue}>{order.address}</Text>
            </View>
          )}
        </View>

        {/* Products Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart-outline" size={20} color="#22C55E" />
            <Text style={styles.cardTitle}>Sản phẩm ({order.items.length})</Text>
          </View>
          {order.items.map((item, index) => (
            <View key={index} style={styles.productItem}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.productImage} resizeMode="cover" />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="cube-outline" size={24} color="#D1D5DB" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.productPrice}>{formatCurrency(item.price)} x {item.quantity}</Text>
              </View>
              <Text style={styles.productTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={20} color="#22C55E" />
            <Text style={styles.cardTitle}>Thanh toán</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="wallet" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Phương thức:</Text>
            <Text style={styles.infoValue}>{getPaymentMethodText(order.paymentMethod)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
            <Text style={[styles.summaryValue, shippingFee === 0 && { color: '#22C55E' }]}>
              {shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}
            </Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.discountLabelRow}>
                <Ionicons name="ticket" size={16} color="#F97316" />
                <Text style={styles.discountLabel}>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}:</Text>
              </View>
              <Text style={styles.discountValue}>-{formatCurrency(order.discount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {/* Note Card */}
        {order.note && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color="#22C55E" />
              <Text style={styles.cardTitle}>Ghi chú</Text>
            </View>
            <Text style={styles.noteText}>{order.note}</Text>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color="#22C55E" />
            <Text style={styles.cardTitle}>Trạng thái đơn hàng</Text>
          </View>
          <View style={styles.timeline}>
            {['pending', 'confirmed', 'preparing', 'delivering', 'completed'].map((status, index) => {
              const statusOrder = ['pending', 'confirmed', 'preparing', 'delivering', 'completed'];
              const currentIndex = statusOrder.indexOf(orderStatus);
              const isActive = index <= currentIndex;
              const isCurrent = status === orderStatus;
              
              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot, 
                    isActive && styles.timelineDotActive,
                    isCurrent && styles.timelineDotCurrent
                  ]} />
                  <Text style={[styles.timelineText, isActive && styles.timelineTextActive]}>
                    {getStatusText(status)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Support Button */}
      {orderStatus !== 'completed' && orderStatus !== 'cancelled' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => router.push('/client/chat')}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#22C55E" />
            <Text style={styles.supportText}>Liên hệ hỗ trợ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  
  content: { flex: 1 },
  card: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  orderDate: { fontSize: 13, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600', color: 'white' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
  
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  productImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F3F4F6' },
  productImagePlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  productPrice: { fontSize: 13, color: '#6B7280' },
  productTotal: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  discountLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountLabel: { fontSize: 14, color: '#F97316' },
  discountValue: { fontSize: 14, fontWeight: '600', color: '#F97316' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#22C55E' },
  noteText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  
  timeline: { gap: 12 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
  timelineDotActive: { backgroundColor: '#DCFCE7' },
  timelineDotCurrent: { backgroundColor: '#22C55E' },
  timelineText: { fontSize: 14, color: '#9CA3AF' },
  timelineTextActive: { color: '#1F2937', fontWeight: '500' },
  
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  supportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#22C55E' },
  supportText: { fontSize: 16, fontWeight: '600', color: '#22C55E' },
});