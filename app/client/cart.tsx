// app/client/cart.tsx - 🎨 REDESIGNED Fresh Market Theme - FIXED
import { useCart } from '@/contexts/CartContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

const FREE_SHIPPING_THRESHOLD = 200000;
const SHIPPING_FEE = 30000;

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, getTotal, getItemCount } = useCart();

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const subtotal = getTotal();
  const itemCount = getItemCount();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (subtotal > 0 ? SHIPPING_FEE : 0);
  const total = subtotal + shipping;
  const progressPercent = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  const handleIncrease = (itemId: string, currentQty: number, stock?: number) => {
    if (stock && currentQty >= stock) {
      showAlert('Thông báo', 'Đã đạt số lượng tối đa');
      return;
    }
    updateQuantity(itemId, currentQty + 1);
  };

  const handleDecrease = (itemId: string, currentQty: number) => {
    if (currentQty <= 1) {
      showConfirmDialog('Xóa sản phẩm', 'Bạn có chắc muốn xóa?', () => removeItem(itemId));
      return;
    }
    updateQuantity(itemId, currentQty - 1);
  };

  const handleClearCart = () => {
    showConfirmDialog('Xóa giỏ hàng', 'Xóa tất cả sản phẩm?', () => clearCart());
  };

  const getCategoryEmoji = (category?: string) => {
    const emojis: Record<string, string> = { 'Thực phẩm': '🍎', 'Đồ uống': '🥤', 'Snack': '🍿', 'Sữa': '🥛', 'Vệ sinh': '🧼', default: '📦' };
    return category ? emojis[category] || emojis.default : emojis.default;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Giỏ hàng</Text>
            {itemCount > 0 && <Text style={styles.headerSubtitle}>{itemCount} sản phẩm</Text>}
          </View>
          {items.length > 0 ? (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearCart}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>
      </LinearGradient>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={80} color="#D1D5DB" /></View>
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyText}>Hãy thêm sản phẩm để bắt đầu mua sắm</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/client/products')}>
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.shopBtnGradient}>
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text style={styles.shopBtnText}>Mua sắm ngay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Free Shipping Banner */}
            {subtotal < FREE_SHIPPING_THRESHOLD ? (
              <View style={styles.shippingBanner}>
                <View style={styles.shippingBannerContent}>
                  <Ionicons name="car-outline" size={20} color="#F97316" />
                  <Text style={styles.shippingBannerText}>
                    Mua thêm <Text style={styles.shippingAmount}>{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}</Text> để được miễn phí vận chuyển!
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            ) : (
              <View style={[styles.shippingBanner, { backgroundColor: '#DCFCE7' }]}>
                <View style={styles.shippingBannerContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <Text style={[styles.shippingBannerText, { color: '#22C55E' }]}>🎉 Bạn được miễn phí vận chuyển!</Text>
                </View>
              </View>
            )}

            {/* Cart Items */}
            {items.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.itemImageContainer}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <Text style={styles.itemEmoji}>{getCategoryEmoji(item.category)}</Text>
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrease(item.id, item.quantity)}>
                        <Ionicons name={item.quantity <= 1 ? "trash-outline" : "remove"} size={18} color={item.quantity <= 1 ? "#EF4444" : "#22C55E"} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrease(item.id, item.quantity, item.stock)}>
                        <Ionicons name="add" size={18} color="#22C55E" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{formatPrice(item.price * item.quantity)}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.removeBtn} onPress={() => showConfirmDialog('Xóa', 'Xóa sản phẩm này?', () => removeItem(item.id))}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Voucher Section - FIXED: correct route */}
            <TouchableOpacity style={styles.voucherCard} onPress={() => router.push('/client/vouchers')}>
              <View style={styles.voucherLeft}>
                <View style={styles.voucherIcon}><Ionicons name="ticket-outline" size={24} color="#F97316" /></View>
                <Text style={styles.voucherText}>Mã giảm giá</Text>
              </View>
              <View style={styles.voucherRight}>
                <Text style={styles.voucherAction}>Chọn voucher</Text>
                <Ionicons name="chevron-forward" size={20} color="#22C55E" />
              </View>
            </TouchableOpacity>

            <View style={{ height: 200 }} />
          </ScrollView>

          {/* Bottom Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
              <Text style={[styles.summaryValue, shipping === 0 && { color: '#22C55E' }]}>
                {shipping === 0 ? 'Miễn phí' : formatPrice(shipping)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>

            <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/client/checkout')}>
              <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkoutGradient}>
                <Text style={styles.checkoutText}>Thanh toán</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  clearBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  shopBtn: { borderRadius: 14, overflow: 'hidden' },
  shopBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, gap: 8 },
  shopBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  shippingBanner: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16, marginBottom: 20 },
  shippingBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  shippingBannerText: { flex: 1, fontSize: 13, color: '#9A3412', fontWeight: '500' },
  shippingAmount: { fontWeight: '700', color: '#F97316' },
  progressBar: { height: 6, backgroundColor: '#FED7AA', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 3 },

  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  itemImageContainer: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemImage: { width: '100%', height: '100%', borderRadius: 12 },
  itemEmoji: { fontSize: 36 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemPrice: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginHorizontal: 16 },
  itemTotal: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  voucherCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  voucherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voucherIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' },
  voucherText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  voucherRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voucherAction: { fontSize: 14, fontWeight: '600', color: '#22C55E' },

  summary: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 15, color: '#6B7280' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  totalLabel: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#22C55E' },
  checkoutBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  checkoutGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  checkoutText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});