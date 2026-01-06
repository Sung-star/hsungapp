import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getOrder } from '@/firebase/orderService';
import { Ionicons } from '@expo/vector-icons';

export default function ClientOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getOrder(id as string);
        if (!data) {
          Alert.alert('Lỗi', 'Không tìm thấy đơn hàng', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setOrder({ ...data, id });
      } catch (err) {
        console.error('Error loading order:', err);
        Alert.alert('Lỗi', 'Không thể tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Chi tiết đơn hàng</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{new Date(order.createdAt?.seconds ? order.createdAt.toDate() : order.createdAt).toLocaleString()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sản phẩm ({order.items.length})</Text>
          {order.items.map((it: any, idx: number) => (
            <View key={idx} style={styles.productRow}>
              {it.productImage ? (
                <Image source={{ uri: it.productImage }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder} />
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.productName}>{it.productName}</Text>
                <Text style={styles.productMeta}>{formatCurrency(it.price)} x {it.quantity}</Text>
              </View>
              <Text style={styles.productTotal}>{formatCurrency(it.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thanh toán</Text>
          <View style={styles.row}>
            <Text>Tạm tính</Text>
            <Text>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Giảm giá</Text>
            <Text>-{formatCurrency(order.discount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  orderNumber: { fontWeight: '700', marginBottom: 6 },
  orderDate: { color: '#888', fontSize: 12 },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f0f0f0' },
  productImagePlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  productName: { fontWeight: '600' },
  productMeta: { color: '#777', fontSize: 12 },
  productTotal: { fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalLabel: { fontWeight: '700' },
  totalValue: { fontWeight: '700', color: '#43A047' },
});
