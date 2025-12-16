import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProductById } from '@/firebase/productService';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  createdAt: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);

 useEffect(() => {
  const load = async () => {
    const p = await getProductById(id as string);
    setProduct(p);
  };
  load();
}, [id]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa sản phẩm "${product?.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            // TODO: Delete from Firebase
            Alert.alert('Thành công', 'Đã xóa sản phẩm', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const profit = product.price - product.costPrice;
  const profitPercent = ((profit / product.costPrice) * 100).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push(`/products/edit/${product.id}`)}
          >
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.categoryBadge}>
            <Ionicons name="pricetag" size={14} color="#667eea" />
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá bán:</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(product.price)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá nhập:</Text>
              <Text style={styles.costValue}>
                {formatCurrency(product.costPrice)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.profitLabel}>Lợi nhuận:</Text>
              <View style={styles.profitContainer}>
                <Text style={styles.profitValue}>
                  {formatCurrency(profit)}
                </Text>
                <View style={styles.profitBadge}>
                  <Text style={styles.profitPercent}>+{profitPercent}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stock Card */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={20} color="#1a1a1a" />
            <Text style={styles.sectionTitle}>Tồn kho</Text>
          </View>
          <View
            style={[
              styles.stockCard,
              product.stock < 50 && styles.stockCardLow,
            ]}
          >
            <Text style={styles.stockNumber}>{product.stock}</Text>
            <Text style={styles.stockUnit}>sản phẩm</Text>
            {product.stock < 50 && (
              <View style={styles.warningBadge}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={styles.warningText}>Tồn kho thấp</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#1a1a1a" />
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã SKU:</Text>
            <Text style={styles.detailValue}>{product.sku || 'Chưa có'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ngày tạo:</Text>
            <Text style={styles.detailValue}>
              {new Date(product.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mô tả:</Text>
          </View>
          <Text style={styles.description}>
            {product.description || 'Chưa có mô tả'}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/inventory/add?productId=${product.id}`)}
          >
            <LinearGradient
              colors={['#43A047', '#66BB6A']}
              style={styles.actionGradient}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Nhập thêm hàng</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/products/edit/${product.id}`)}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.actionGradient}
            >
              <Ionicons name="create-outline" size={24} color="white" />
              <Text style={styles.actionText}>Chỉnh sửa</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delete Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          <Text style={styles.deleteText}>Xóa sản phẩm</Text>
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
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  priceSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#43A047',
  },
  costValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  profitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
  profitBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  profitPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#43A047',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  stockCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stockCardLow: {
    backgroundColor: '#FFEBEE',
  },
  stockNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1976D2',
  },
  stockUnit: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginTop: 8,
  },
  actionsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
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