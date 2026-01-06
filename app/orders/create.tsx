import { createOrder, generateOrderNumber } from '@/firebase/orderService';
import { getAllProducts } from '@/firebase/productService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Order, OrderItem } from '../types/order';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export default function CreateOrderScreen() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [discount, setDiscount] = useState('0');
  const [loading, setLoading] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Add product to order
  const addProductToOrder = (product: Product) => {
    const existingItem = selectedItems.find(
      (item) => item.productId === product.id
    );

    if (existingItem) {
      // Increase quantity
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Lỗi', 'Không đủ tồn kho');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        quantity: 1,
        price: product.price,
        total: product.price,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
    setShowProductModal(false);
  };

  // Update quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    setSelectedItems(
      selectedItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      )
    );
  };

  // Remove item
  const removeItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.productId !== productId));
  };

  // Calculate totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Number(discount) || 0;
  const total = subtotal - discountAmount;

  // Filter products
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create order
  const handleCreateOrder = async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khách hàng');
      return;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    setLoading(true);

    try {
      const orderData: Omit<Order, 'id'> = {
        orderNumber: generateOrderNumber(),
        customerName,
        customerPhone,
        items: selectedItems,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        status: 'pending',
        note: note || undefined,
      };

      const orderId = await createOrder(orderData);

      Alert.alert('Thành công', 'Đã tạo đơn hàng!', [
        {
          text: 'Xem chi tiết',
          onPress: () => router.replace(`/orders/${orderId}`),
        },
        {
          text: 'Về danh sách',
          onPress: () => router.replace('/(tabs)/orders'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo đơn hàng</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tên khách hàng <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên khách hàng"
              placeholderTextColor="#999"
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Số điện thoại <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm</Text>
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={() => setShowProductModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>

          {selectedItems.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có sản phẩm</Text>
              <TouchableOpacity
                style={styles.addFirstBtn}
                onPress={() => setShowProductModal(true)}
              >
                <Text style={styles.addFirstText}>+ Thêm sản phẩm</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {selectedItems.map((item) => (
                <View key={item.productId} style={styles.orderItem}>
                  <Image
                    source={{ uri: item.productImage }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                    >
                      <Ionicons name="remove" size={16} color="#667eea" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                    >
                      <Ionicons name="add" size={16} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeItem(item.productId)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thanh toán</Text>

          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'cash' && styles.paymentMethodActive,
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons
                name="cash-outline"
                size={24}
                color={paymentMethod === 'cash' ? '#667eea' : '#999'}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === 'cash' && styles.paymentTextActive,
                ]}
              >
                Tiền mặt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'transfer' && styles.paymentMethodActive,
              ]}
              onPress={() => setPaymentMethod('transfer')}
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={paymentMethod === 'transfer' ? '#667eea' : '#999'}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === 'transfer' && styles.paymentTextActive,
                ]}
              >
                Chuyển khoản
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'card' && styles.paymentMethodActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={paymentMethod === 'card' ? '#667eea' : '#999'}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === 'card' && styles.paymentTextActive,
                ]}
              >
                Thẻ
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giảm giá</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={discount}
              onChangeText={setDiscount}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập ghi chú (tùy chọn)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giảm giá:</Text>
            <Text style={styles.discountValue}>
              -{formatCurrency(discountAmount)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateOrder}
          disabled={loading}
        >
          <LinearGradient
            colors={['#43A047', '#66BB6A']}
            style={styles.createGradient}
          >
            <Text style={styles.createText}>
              {loading ? 'Đang tạo...' : 'Tạo đơn hàng'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn sản phẩm</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={28} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm sản phẩm..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => addProductToOrder(item)}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.modalProductImage}
                  />
                  <View style={styles.modalProductInfo}>
                    <Text style={styles.modalProductName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.modalProductPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                    <Text style={styles.modalProductStock}>
                      Kho: {item.stock}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={32} color="#667eea" />
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
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
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  addProductBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  emptyProducts: {  
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#667eea',
  },
  addFirstText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  orderItem: {
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
    color: '#43A047',
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  paymentMethodActive: {
    backgroundColor: '#f0f0ff',
    borderColor: '#667eea',
  },
  paymentText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    fontWeight: '600',
  },
  paymentTextActive: {
    color: '#667eea',
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#43A047',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#43A047',
    marginBottom: 2,
  },
  modalProductStock: {
    fontSize: 12,
    color: '#999',
  },
});