// app/client/checkout.tsx - FIXED: QRPaymentModal works on mobile
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { createOrder, generateOrderNumber, updateOrderStatus } from '@/firebase/orderService';
import { auth, db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Order } from '@/types/order';
import { PaymentMethod } from '@/types/payment';
import { showAlert, showAlertWithOptions } from '@/utils/platformAlert';
import { createPayment, simulatePaymentProcessing } from '@/services/paymentService';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';
import QRPaymentModal from '@/components/payment/QRPaymentModal';
import PaymentStatusModal from '@/components/payment/PaymentStatusModal';
import VoucherInput from '@/components/voucher/VoucherInput';
import { ApplyVoucherResponse, confirmVoucherUsage } from '@/services/voucherService';

const FREE_SHIPPING_THRESHOLD = 200000;
const SHIPPING_FEE = 30000;

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export default function CheckoutScreen() {
  const { items, getTotal, clearCart, getItemCount } = useCart();
  const user = auth.currentUser;
  const itemCount = getItemCount();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Voucher state
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    voucherId?: string;
  } | null>(null);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Payment modals - FIXED: Separate state management
  const [showQRModal, setShowQRModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [currentPayment, setCurrentPayment] = useState<{
    id: string;
    transactionId: string;
    qrCodeUrl: string;
    orderId: string;
    bankInfo?: any;
  } | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      let userName = user.displayName || '';
      let userPhone = '';
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userName = userData.displayName || user.displayName || '';
        userPhone = userData.phone || '';
      }
      
      setCustomerName(userName);
      setCustomerPhone(userPhone);

      const addressQuery = query(
        collection(db, 'addresses'),
        where('userId', '==', user.uid)
      );
      const addressSnapshot = await getDocs(addressQuery);
      
      const addresses: SavedAddress[] = [];
      addressSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.deleted) {
          addresses.push({
            id: docSnap.id,
            name: data.name || '',
            phone: data.phone || '',
            address: data.address || '',
            isDefault: data.isDefault || false,
          });
        }
      });

      setSavedAddresses(addresses);

      const defaultAddress = addresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        if (!userName) setCustomerName(defaultAddress.name);
        if (!userPhone) setCustomerPhone(defaultAddress.phone);
        setAddress(defaultAddress.address);
      } else if (addresses.length > 0) {
        if (!userName) setCustomerName(addresses[0].name);
        if (!userPhone) setCustomerPhone(addresses[0].phone);
        setAddress(addresses[0].address);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setCustomerName(user.displayName || '');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSelectAddress = (addr: SavedAddress) => {
    setCustomerName(addr.name);
    setCustomerPhone(addr.phone);
    setAddress(addr.address);
    setShowAddressPicker(false);
  };

  // Voucher handlers
  const handleVoucherApplied = (response: ApplyVoucherResponse) => {
    if (response.success && response.voucher) {
      setAppliedVoucher({
        code: 'code' in response.voucher ? response.voucher.code : response.voucher.voucherCode,
        discountAmount: response.discountAmount,
        voucherId: response.voucher.id,
      });
      showAlert('Thành công', `Đã áp dụng mã giảm ${formatPrice(response.discountAmount)}`);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
  };

  const formatPrice = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  const subtotal = getTotal();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const discount = appliedVoucher?.discountAmount || 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const validateForm = (): boolean => {
    if (!customerName.trim()) { showAlert('Lỗi', 'Vui lòng nhập tên'); return false; }
    if (!customerPhone.trim()) { showAlert('Lỗi', 'Vui lòng nhập số điện thoại'); return false; }
    if (!address.trim()) { showAlert('Lỗi', 'Vui lòng nhập địa chỉ giao hàng'); return false; }
    if (items.length === 0) { showAlert('Lỗi', 'Giỏ hàng trống'); return false; }
    return true;
  };

  // FIXED: handlePlaceOrder - use qrCodeUrl from createPayment response
  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const orderNumber = generateOrderNumber();
      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        orderNumber,
        customerId: user?.uid || '',
        customerName,
        customerPhone,
        address,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          productImage: item.imageUrl || '',
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        shipping,
        discount,
        voucherCode: appliedVoucher?.code || '',
        total,
        paymentMethod: paymentMethod === 'cod' ? 'cash' : 'transfer',
        status: 'pending',
        note: note || '',
      };

      const orderId = await createOrder(orderData);
      console.log('✅ Order created:', orderId);

      // Confirm voucher usage if applied
      if (appliedVoucher && user) {
        await confirmVoucherUsage(
          user.uid,
          appliedVoucher.code,
          orderId,
          orderNumber,
          appliedVoucher.discountAmount,
          total
        );
      }

      if (paymentMethod === 'cod') {
        clearCart();
        showAlertWithOptions(
          'Đặt hàng thành công! 🎉',
          `Mã đơn: ${orderNumber}\n${appliedVoucher ? `Đã giảm: ${formatPrice(discount)}` : ''}`,
          [
            { text: 'Về trang chủ', onPress: () => router.replace('/client' as any) },
            { text: 'Xem đơn hàng', onPress: () => router.replace(`/client/order/${orderId}` as any) },
          ]
        );
      } else {
        // FIXED: Create payment and use its qrCodeUrl directly
        const payment = await createPayment(orderId, orderNumber, user?.uid || '', total, paymentMethod);
        console.log('✅ Payment created:', payment);
        
        if (payment && payment.qrCodeUrl) {
          // Set payment data with qrCodeUrl from service
          setCurrentPayment({ 
            id: payment.id!, 
            transactionId: payment.transactionId || '', 
            qrCodeUrl: payment.qrCodeUrl, // Use qrCodeUrl from payment service
            orderId,
            bankInfo: payment.bankInfo || null,
          });
          
          // IMPORTANT: Show QR Modal after setting payment data
          console.log('🔓 Opening QR Modal...');
          setTimeout(() => {
            setShowQRModal(true);
          }, 100); // Small delay to ensure state is set
        } else {
          showAlert('Lỗi', 'Không thể tạo thanh toán. Vui lòng thử lại.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error placing order:', error);
      showAlert('Lỗi', error.message || 'Không thể đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentPayment) return;
    
    console.log('💳 Confirming payment:', currentPayment.id);
    const result = await simulatePaymentProcessing(currentPayment.id, true);
    
    setShowQRModal(false);
    setPaymentSuccess(result.success);
    setPaymentMessage(result.success ? 'Cảm ơn bạn đã mua hàng!' : 'Thanh toán không thành công.');
    
    if (result.success) {
      await updateOrderStatus(currentPayment.orderId, 'confirmed');
      clearCart();
    }
    
    // Show status modal after closing QR modal
    setTimeout(() => {
      setShowStatusModal(true);
    }, 300);
  };

  const handleCancelPayment = () => {
    console.log('❌ Payment cancelled');
    setShowQRModal(false);
    setCurrentPayment(null);
    showAlert('Đã hủy', 'Bạn đã hủy thanh toán. Đơn hàng vẫn được lưu, bạn có thể thanh toán sau.');
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Thanh toán</Text>
            <Text style={styles.headerSubtitle}>{itemCount} sản phẩm</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="location" size={20} color="#22C55E" />
              </View>
              <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
            </View>
            {savedAddresses.length > 0 && (
              <TouchableOpacity style={styles.changeBtn} onPress={() => setShowAddressPicker(true)}>
                <Text style={styles.changeBtnText}>Đổi</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ tên <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Nhập họ tên" placeholderTextColor="#9CA3AF" value={customerName} onChangeText={setCustomerName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Nhập số điện thoại" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" value={customerPhone} onChangeText={setCustomerPhone} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Nhập địa chỉ giao hàng" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} value={address} onChangeText={setAddress} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Ghi chú cho shop (tùy chọn)" placeholderTextColor="#9CA3AF" multiline numberOfLines={2} value={note} onChangeText={setNote} />
          </View>
        </View>

        {/* Voucher Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="ticket" size={20} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Mã giảm giá</Text>
          </View>
          
          <VoucherInput
            orderSubtotal={subtotal}
            items={items.map(item => ({
              productId: item.productId,
              category: item.category,
              quantity: item.quantity,
              price: item.price,
            }))}
            onVoucherApplied={handleVoucherApplied}
            appliedVoucher={appliedVoucher}
            onRemoveVoucher={handleRemoveVoucher}
          />

          <TouchableOpacity 
            style={styles.viewVouchersBtn}
            onPress={() => router.push('/client/vouchers')}
          >
            <Ionicons name="gift-outline" size={18} color="#22C55E" />
            <Text style={styles.viewVouchersBtnText}>Xem voucher của bạn</Text>
            <Ionicons name="chevron-forward" size={16} color="#22C55E" />
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="card" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="receipt" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Đơn hàng ({items.length})</Text>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.orderItemQty}>x{item.quantity}</Text>
              </View>
              <Text style={styles.orderItemPrice}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 220 }} />
      </ScrollView>

      {/* Bottom Summary */}
      <View style={styles.bottomSummary}>
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
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.discountRow}>
              <Ionicons name="ticket" size={16} color="#F97316" />
              <Text style={styles.discountLabel}>Giảm giá</Text>
            </View>
            <Text style={styles.discountValue}>-{formatPrice(discount)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]} 
          onPress={handlePlaceOrder} 
          disabled={loading}
        >
          <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.placeOrderGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.placeOrderText}>{paymentMethod === 'cod' ? 'Đặt hàng' : 'Thanh toán'}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Address Picker Modal */}
      <Modal
        visible={showAddressPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn địa chỉ</Text>
              <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {savedAddresses.map((addr) => (
                <TouchableOpacity 
                  key={addr.id} 
                  style={[styles.addressCard, address === addr.address && styles.addressCardActive]} 
                  onPress={() => handleSelectAddress(addr)}
                >
                  <View style={styles.addressCardHeader}>
                    <Text style={styles.addressCardName}>{addr.name}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressCardPhone}>{addr.phone}</Text>
                  <Text style={styles.addressCardText}>{addr.address}</Text>
                  {address === addr.address && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Payment Modal - FIXED: Always render, control with visible prop */}
      <QRPaymentModal 
        visible={showQRModal} 
        method={paymentMethod} 
        amount={total} 
        transactionId={currentPayment?.transactionId || ''} 
        qrCodeUrl={currentPayment?.qrCodeUrl || ''} 
        bankInfo={currentPayment?.bankInfo}
        onClose={handleCloseQRModal} 
        onConfirmPayment={handleConfirmPayment} 
        onCancel={handleCancelPayment} 
      />

      {/* Payment Status Modal */}
      <PaymentStatusModal 
        visible={showStatusModal} 
        success={paymentSuccess} 
        message={paymentMessage} 
        transactionId={currentPayment?.transactionId} 
        onClose={() => setShowStatusModal(false)} 
        onViewOrder={() => { 
          setShowStatusModal(false); 
          router.replace(`/client/order/${currentPayment?.orderId}` as any); 
        }} 
        onGoHome={() => { 
          setShowStatusModal(false); 
          router.replace('/client' as any); 
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  changeBtn: { backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },

  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { height: 80, textAlignVertical: 'top' },

  viewVouchersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, backgroundColor: '#F0FDF4', borderRadius: 10 },
  viewVouchersBtnText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },

  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  orderItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderItemName: { flex: 1, fontSize: 14, color: '#1F2937' },
  orderItemQty: { fontSize: 13, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  orderItemPrice: { fontSize: 14, fontWeight: '600', color: '#22C55E', marginLeft: 12 },

  bottomSummary: { backgroundColor: '#fff', padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountLabel: { fontSize: 14, color: '#F97316' },
  discountValue: { fontSize: 14, fontWeight: '600', color: '#F97316' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#22C55E' },
  placeOrderBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  placeOrderBtnDisabled: { opacity: 0.6 },
  placeOrderGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  placeOrderText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  addressCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  addressCardActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressCardName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  defaultBadge: { backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  addressCardPhone: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  addressCardText: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  checkIcon: { position: 'absolute', top: 16, right: 16 },
});