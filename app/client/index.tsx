import { auth, db } from '@/config/firebase';
import { useCart } from '@/contexts/CartContext';
import { logout } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string; // ===== FIX =====
  description?: string;
}

export default function ClientHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addItem, items } = useCart();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'Khách hàng');
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('createdAt', 'desc'), limit(8));
      const snapshot = await getDocs(q);

      // ===== FIX imageUrl + map tường minh =====
      const productsList: Product[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          price: data.price,
          category: data.category,
          stock: data.stock,
          imageUrl: data.imageUrl || '',
          description: data.description || '',
        };
      });

      setProducts(productsList);
      console.log('✅ Loaded products:', productsList.length);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
      return;
    }

    const cartItem = items.find(item => item.productId === product.id);
    if (cartItem && cartItem.quantity >= product.stock) {
      Alert.alert('Thông báo', 'Đã đạt số lượng tối đa trong kho');
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl, // ===== FIX =====
      category: product.category,
      stock: product.stock,
    });

    Alert.alert('Thành công', `Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/client/product/${productId}`);
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/auth/login');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể đăng xuất');
          }
        },
      },
    ]);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Thực phẩm': '🍎',
      'Đồ uống': '🥤',
      'Snack': '🍿',
      'Mỹ phẩm': '💄',
      'Vệ sinh': '🧼',
      'Gia dụng': '🏠',
      'Đồ dùng': '🛒',
      default: '📦',
    };
    return icons[category] || icons.default;
  };

  const categories = [
    { id: 1, name: 'Thực phẩm', icon: '🍎', color: '#2ecc71' },
    { id: 2, name: 'Đồ uống', icon: '🥤', color: '#3498db' },
    { id: 3, name: 'Snack', icon: '🍿', color: '#f39c12' },
    { id: 4, name: 'Vệ sinh', icon: '🧼', color: '#9b59b6' },
  ];

  const handleCategoryPress = (categoryName: string) => {
    router.push({
      pathname: '/client/products',
      params: { category: categoryName }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào! 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => router.push('/client/order/index')}
            >
              <Ionicons name="receipt-outline" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => router.push('/client/products')}
        >
          <Ionicons name="search" size={20} color="#95a5a6" />
          <Text style={styles.searchPlaceholder}>Tìm kiếm sản phẩm...</Text>
          <View style={styles.searchIcon}>
            <Ionicons name="options-outline" size={18} color="#667eea" />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={styles.bannerTitle}>🛒 Siêu thị mini</Text>
                <Text style={styles.bannerSubtitle}>Mua sắm tiện lợi{'\n'}Giá cả phải chăng</Text>
                <TouchableOpacity 
                  style={styles.bannerButton}
                  onPress={() => router.push('/client/products')}
                >
                  <Text style={styles.bannerButtonText}>Khám phá ngay</Text>
                  <Ionicons name="arrow-forward" size={16} color="#667eea" />
                </TouchableOpacity>
              </View>
              <Text style={styles.bannerEmoji}>🛍️</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục sản phẩm</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.name)}
              >
                <LinearGradient
                  colors={[category.color, category.color + 'dd']}
                  style={styles.categoryGradient}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
              <Text style={styles.sectionSubtitle}>Được yêu thích nhất</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/client/products')}
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
              <Ionicons name="arrow-forward" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={64} color="#ccc" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có sản phẩm</Text>
              <Text style={styles.emptyText}>Vui lòng quay lại sau</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.productsScroll}
              contentContainerStyle={styles.productsScrollContent}
            >
              {products.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productImageContainer}>
                    {product.imageUrl  ? (
                      <Image 
                        source={{ uri: product.imageUrl  }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productPlaceholder}>
                        <Text style={styles.productPlaceholderIcon}>
                          {getCategoryIcon(product.category)}
                        </Text>
                      </View>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <View style={styles.lowStockBadge}>
                        <Text style={styles.lowStockText}>Sắp hết</Text>
                      </View>
                    )}
                    {product.stock === 0 && (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Hết hàng</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <View style={styles.productFooter}>
                      <View>
                        <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                        <Text style={styles.productStock}>
                          <Ionicons 
                            name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
                            size={12} 
                            color={product.stock > 0 ? "#43A047" : "#EF5350"} 
                          />
                          {' '}Còn {product.stock}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.addToCartIconButton,
                          product.stock === 0 && styles.addToCartIconButtonDisabled
                        ]}
                        disabled={product.stock === 0}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                      >
                        <Ionicons 
                          name={product.stock > 0 ? "cart-outline" : "close"} 
                          size={20} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiện ích nhanh</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/order/index')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="receipt-outline" size={28} color="#667eea" />
              </View>
              <Text style={styles.actionText}>Đơn hàng</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/favorites')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="heart-outline" size={28} color="#E91E63" />
              </View>
              <Text style={styles.actionText}>Yêu thích</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Khuyến mãi', 'Tính năng đang phát triển')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="pricetag-outline" size={28} color="#FFA726" />
              </View>
              <Text style={styles.actionText}>Khuyến mãi</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Hỗ trợ', 'Liên hệ: 1900 1234')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="chatbubble-outline" size={28} color="#43A047" />
              </View>
              <Text style={styles.actionText}>Hỗ trợ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#667eea" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Miễn phí vận chuyển</Text>
              <Text style={styles.infoText}>Đơn hàng từ 200.000đ</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#95a5a6',
    fontSize: 15,
  },
  searchIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  banner: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  bannerButtonText: {
    color: '#667eea',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerEmoji: {
    fontSize: 60,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAll: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  categoryName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  productsScroll: {
    marginHorizontal: -20,
  },
  productsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f5f6fa',
  },
  productPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productPlaceholderIcon: {
    fontSize: 50,
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFA726',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF5350',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    minHeight: 36,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 11,
    color: '#999',
  },
  addToCartIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartIconButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#999',
  },
});