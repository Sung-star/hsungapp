// app/orders/[id].tsx
import {
  deleteOrder,
  getOrder,
  updateOrderStatus
} from '@/firebase/orderService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Order, OrderStatus } from '@/types/order';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
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
      } catch (error) {
        console.error(error);
        Alert.alert('Lỗi', 'Không thể tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'transfer':
        return 'Chuyển khoản';
      case 'card':
        return 'Thẻ';
      default:
        return method;
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    const statusText = getStatusText(newStatus);
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn chuyển trạng thái sang "${statusText}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await updateOrderStatus(id as string, newStatus);
              setOrder({ ...order, status: newStatus });
              Alert.alert('Thành công', 'Đã cập nhật trạng thái');
            } catch (error) {
              console.error(error);
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa đơn hàng "${order?.orderNumber}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(id as string);
              Alert.alert('Thành công', 'Đã xóa đơn hàng', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/orders') },
              ]);
            } catch (error) {
              console.error(error);
              Alert.alert('Lỗi', 'Không thể xóa đơn hàng');
            }
          },
        },
      ]
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

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Không tìm thấy đơn hàng</Text>
      </View>
    );
  }

  // Force convert status to string
  const orderStatus = String(order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
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
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
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
        </View>

        {/* Customer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color="#667eea" />
            <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color="#666" />
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{order.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color="#666" />
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{order.customerPhone}</Text>
          </View>
          {order.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#666" />
              <Text style={styles.infoLabel}>Địa chỉ:</Text>
              <Text style={styles.infoValue}>{order.address}</Text>
            </View>
          )}
        </View>

        {/* Products Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart-outline" size={20} color="#667eea" />
            <Text style={styles.cardTitle}>Sản phẩm ({order.items.length})</Text>
          </View>
          {order.items.map((item, index) => (
            <View key={index} style={styles.productItem}>
              <Image source={{ uri: item.productImage }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.productPrice}>
                  {formatCurrency(item.price)} x {item.quantity}
                </Text>
              </View>
              <Text style={styles.productTotal}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={20} color="#667eea" />
            <Text style={styles.cardTitle}>Thanh toán</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="wallet" size={18} color="#666" />
            <Text style={styles.infoLabel}>Phương thức:</Text>
            <Text style={styles.infoValue}>
              {getPaymentMethodText(order.paymentMethod)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(order.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giảm giá:</Text>
            <Text style={styles.discountValue}>
              -{formatCurrency(order.discount)}
            </Text>
          </View>
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
              <Ionicons name="document-text-outline" size={20} color="#667eea" />
              <Text style={styles.cardTitle}>Ghi chú</Text>
            </View>
            <Text style={styles.noteText}>{order.note}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {orderStatus === 'pending' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpdateStatus('confirmed')}
            >
              <LinearGradient
                colors={['#42A5F5', '#64B5F6']}
                style={styles.actionGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                <Text style={styles.actionText}>Xác nhận</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpdateStatus('cancelled')}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.actionGradient}
              >
                <Ionicons name="close-circle-outline" size={24} color="white" />
                <Text style={styles.actionText}>Hủy đơn</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {orderStatus === 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionButton, { marginHorizontal: 20, marginTop: 16 }]}
            onPress={() => handleUpdateStatus('preparing')}
          >
            <LinearGradient
              colors={['#AB47BC', '#BA68C8']}
              style={styles.actionGradient}
            >
              <Ionicons name="restaurant-outline" size={24} color="white" />
              <Text style={styles.actionText}>Bắt đầu chuẩn bị</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {orderStatus === 'preparing' && (
          <TouchableOpacity
            style={[styles.actionButton, { marginHorizontal: 20, marginTop: 16 }]}
            onPress={() => handleUpdateStatus('delivering')}
          >
            <LinearGradient
              colors={['#5C6BC0', '#7986CB']}
              style={styles.actionGradient}
            >
              <Ionicons name="bicycle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Bắt đầu giao hàng</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {orderStatus === 'delivering' && (
          <TouchableOpacity
            style={[styles.actionButton, { marginHorizontal: 20, marginTop: 16 }]}
            onPress={() => handleUpdateStatus('completed')}
          >
            <LinearGradient
              colors={['#43A047', '#66BB6A']}
              style={styles.actionGradient}
            >
              <Ionicons name="checkmark-done-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Hoàn thành</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delete Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          <Text style={styles.deleteText}>Xóa đơn hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
  },
  productTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#43A047',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  discountValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#43A047',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});