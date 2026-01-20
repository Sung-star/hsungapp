// app/client/index.tsx - 🎨 REDESIGNED Fresh Market Theme (FIXED) - DYNAMIC CATEGORIES

import FloatingChatButton from '@/components/chat/FloatingChatButton';
import { auth, db } from '@/config/firebase';
import { useCart } from '@/contexts/CartContext';
import { useNotifications } from '@/hooks/useNotifications';
import { logout } from '@/services/authService';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  stock: number;
  imageUrl?: string;
  description?: string;
  isHot?: boolean;
  isNew?: boolean;
  discount?: number;
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  colors: readonly [string, string];
  emoji: string;
  buttonText: string;
}

interface Category {
  name: string;
  icon: string;
  colors: readonly [string, string];
  count: number;
}

export default function ClientHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // ✅ THÊM: Lưu tất cả sản phẩm
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addItem, items, getItemCount } = useCart();
  const { unreadCount } = useNotifications();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  const itemCount = getItemCount();

  // Banners data
  const banners: Banner[] = [
    {
      id: 1,
      title: 'Siêu Sale Cuối Tuần',
      subtitle: 'Giảm đến 50% tất cả sản phẩm',
      colors: ['#F97316', '#FB923C'] as const,
      emoji: '🔥',
      buttonText: 'Mua ngay',
    },
    {
      id: 2,
      title: 'Thực phẩm tươi sống',
      subtitle: 'Nhập hàng mới mỗi ngày',
      colors: ['#22C55E', '#4ADE80'] as const,
      emoji: '🥬',
      buttonText: 'Khám phá',
    },
    {
      id: 3,
      title: 'Freeship đơn từ 200K',
      subtitle: 'Giao hàng siêu tốc 30 phút',
      colors: ['#8B5CF6', '#A78BFA'] as const,
      emoji: '🚀',
      buttonText: 'Đặt hàng',
    },
  ];

  // ✅ CATEGORY ICON & COLOR MAPPING
  const categoryConfig: Record<string, { icon: string; colors: readonly [string, string] }> = {
    'Thực phẩm': { icon: '🍎', colors: ['#22C55E', '#16A34A'] as const },
    'Đồ uống': { icon: '🥤', colors: ['#3B82F6', '#2563EB'] as const },
    'Snack': { icon: '🍿', colors: ['#F97316', '#EA580C'] as const },
    'Sữa': { icon: '🥛', colors: ['#EC4899', '#DB2777'] as const },
    'Vệ sinh': { icon: '🧼', colors: ['#8B5CF6', '#7C3AED'] as const },
    'Gia vị': { icon: '🧂', colors: ['#EAB308', '#CA8A04'] as const },
    'Bánh kẹo': { icon: '🍪', colors: ['#F472B6', '#EC4899'] as const },
    'Mì ăn liền': { icon: '🍜', colors: ['#FB923C', '#F97316'] as const },
    // Default cho các danh mục khác
    'default': { icon: '📦', colors: ['#6B7280', '#4B5563'] as const },
  };

  // ✅ DYNAMIC CATEGORIES từ products
  const categories: Category[] = useMemo(() => {
    if (allProducts.length === 0) return [];

    // Đếm số lượng sản phẩm theo category
    const categoryCount = allProducts.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Tạo array categories
    return Object.entries(categoryCount)
      .map(([name, count]) => {
        const config = categoryConfig[name] || categoryConfig['default'];
        return {
          name,
          icon: config.icon,
          colors: config.colors,
          count,
        };
      })
      .sort((a, b) => b.count - a.count); // Sắp xếp theo số lượng giảm dần
  }, [allProducts]);

  // Quick actions
  const quickActions = [
    { id: 1, name: 'Đơn hàng', icon: 'receipt-outline', color: '#3B82F6', bgColor: '#DBEAFE', route: '/client/my-orders' },
    { id: 2, name: 'Yêu thích', icon: 'heart-outline', color: '#EC4899', bgColor: '#FCE7F3', route: '/client/favorites' },
    { id: 3, name: 'Voucher', icon: 'ticket-outline', color: '#F97316', bgColor: '#FFEDD5', route: '/client/vouchers' },
    { id: 4, name: 'Hỗ trợ', icon: 'chatbubble-ellipses-outline', color: '#22C55E', bgColor: '#DCFCE7', route: '/client/chat' },
  ];

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || 'Khách hàng');
    }
    fetchProducts();
  }, []);

  // Auto scroll banner
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentBanner + 1) % banners.length;
      setCurrentBanner(nextIndex);
      bannerRef.current?.scrollTo({
        x: nextIndex * (SCREEN_WIDTH - 40),
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [currentBanner]);

  const fetchProducts = async () => {
    try {
      // ✅ Lấy TẤT CẢ sản phẩm để tính danh mục
      const allProductsSnapshot = await getDocs(collection(db, 'products'));
      const allProductsList: Product[] = allProductsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        category: doc.data().category,
        stock: doc.data().stock,
        imageUrl: doc.data().imageUrl || '',
        description: doc.data().description || '',
      }));
      setAllProducts(allProductsList);

      // Lấy top 10 sản phẩm mới nhất để hiển thị
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const productsList: Product[] = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          price: data.price,
          originalPrice: data.originalPrice || (index % 3 === 0 ? Math.round(data.price * 1.2) : undefined),
          category: data.category,
          stock: data.stock,
          imageUrl: data.imageUrl || '',
          description: data.description || '',
          isHot: index < 3,
          isNew: index >= 3 && index < 6,
          discount: index % 3 === 0 ? 20 : undefined,
        };
      });

      setProducts(productsList);
      console.log('✅ Loaded products:', productsList.length);
      console.log('✅ All products:', allProductsList.length);
      console.log('✅ Categories found:', [...new Set(allProductsList.map(p => p.category))]);
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
      showAlert('Thông báo', 'Sản phẩm đã hết hàng');
      return;
    }

    const cartItem = items.find(item => item.productId === product.id);
    if (cartItem && cartItem.quantity >= product.stock) {
      showAlert('Thông báo', 'Đã đạt số lượng tối đa trong kho');
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
    });

    showAlert('Thành công', `Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/client/product/${productId}`);
  };

  const handleLogout = () => {
    showConfirmDialog(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      async () => {
        try {
          await logout();
          router.replace('/auth/login');
        } catch (error) {
          showAlert('Lỗi', 'Không thể đăng xuất');
        }
      }
    );
  };

  const handleCategoryPress = (categoryName: string) => {
    router.push({
      pathname: '/client/products',
      params: { category: categoryName }
    });
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    if (action.route) {
      router.push(action.route as any);
    } else {
      showAlert('Thông báo', 'Tính năng đang phát triển');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => router.push('/client/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => router.push('/client/cart')}
              >
                <Ionicons name="cart-outline" size={22} color="#fff" />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => router.push('/client/products')}
            activeOpacity={0.9}
          >
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#22C55E" />
            </View>
            <Text style={styles.searchPlaceholder}>Tìm kiếm sản phẩm...</Text>
            <View style={styles.searchFilterIcon}>
              <Ionicons name="options-outline" size={18} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* Banner Carousel */}
        <View style={styles.bannerSection}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            style={styles.bannerScroll}
            contentContainerStyle={styles.bannerScrollContent}
          >
            {banners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                activeOpacity={0.95}
                onPress={() => router.push('/client/products')}
              >
                <LinearGradient
                  colors={banner.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerCard}
                >
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                      <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                      <TouchableOpacity style={styles.bannerButton}>
                        <Text style={styles.bannerButtonText}>{banner.buttonText}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.bannerEmoji}>{banner.emoji}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Banner Indicators */}
          <View style={styles.bannerIndicators}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.bannerDot,
                  currentBanner === index && styles.bannerDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Categories - ✅ DYNAMIC */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Danh mục</Text>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => router.push('/client/products')}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.categoryLoading}>
              <ActivityIndicator size="small" color="#22C55E" />
            </View>
          ) : categories.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={`${category.name}-${index}`}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(category.name)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={category.colors}
                    style={styles.categoryGradient}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  </LinearGradient>
                  <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{category.count} SP</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.categoryEmpty}>
              <Text style={styles.categoryEmptyText}>Chưa có danh mục nào</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionText}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Flash Sale Section */}
        <View style={styles.section}>
          <View style={styles.flashSaleHeader}>
            <View style={styles.flashSaleTitleContainer}>
              <LinearGradient
                colors={['#EF4444', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.flashSaleBadge}
              >
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={styles.flashSaleTitle}>Flash Sale</Text>
              </LinearGradient>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>Kết thúc sau:</Text>
                <View style={styles.countdownTimer}>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>02</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>45</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownNumber}>30</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => router.push('/client/products')}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScrollContent}
            >
              {products.slice(0, 5).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  {/* Badges */}
                  <View style={styles.productBadges}>
                    {product.discount && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{product.discount}%</Text>
                      </View>
                    )}
                    {product.isHot && !product.discount && (
                      <View style={styles.hotBadge}>
                        <Ionicons name="flame" size={10} color="#fff" />
                        <Text style={styles.hotText}>HOT</Text>
                      </View>
                    )}
                  </View>

                  {/* Image */}
                  <View style={styles.productImageContainer}>
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productPlaceholder}>
                        <Ionicons name="image-outline" size={40} color="#D1D5DB" />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                      {product.originalPrice && (
                        <Text style={styles.originalPrice}>{formatPrice(product.originalPrice)}</Text>
                      )}
                    </View>

                    {/* Stock & Add Button */}
                    <View style={styles.productActions}>
                      <View style={styles.stockInfo}>
                        <View style={[
                          styles.stockDot,
                          { backgroundColor: product.stock > 0 ? '#22C55E' : '#EF4444' }
                        ]} />
                        <Text style={styles.stockText}>
                          {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addToCartBtn,
                          product.stock === 0 && styles.addToCartBtnDisabled
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={product.stock === 0}
                      >
                        <Ionicons 
                          name="add" 
                          size={20} 
                          color={product.stock > 0 ? '#fff' : '#9CA3AF'} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
              <Text style={styles.sectionSubtitle}>Được yêu thích nhất</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => router.push('/client/products')}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>

          {!loading && products.length > 0 && (
            <View style={styles.featuredGrid}>
              {products.slice(0, 4).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.featuredCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  {/* Badge */}
                  {product.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Mới</Text>
                    </View>
                  )}

                  {/* Image */}
                  <View style={styles.featuredImageContainer}>
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.featuredImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.featuredPlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.featuredInfo}>
                    <Text style={styles.featuredName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.featuredPrice}>{formatPrice(product.price)}</Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.featuredAddBtn,
                        product.stock === 0 && styles.featuredAddBtnDisabled
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={product.stock === 0}
                    >
                      <Ionicons name="cart-outline" size={16} color="#fff" />
                      <Text style={styles.featuredAddText}>
                        {product.stock > 0 ? 'Thêm' : 'Hết'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.section}>
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={['#8B5CF6', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoBanner}
            >
              <View style={styles.promoContent}>
                <Ionicons name="gift-outline" size={32} color="#fff" />
                <View style={styles.promoTextContainer}>
                  <Text style={styles.promoTitle}>Miễn phí vận chuyển</Text>
                  <Text style={styles.promoSubtitle}>Cho đơn hàng từ 200.000đ</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Chat Button */}
      <FloatingChatButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  header: {
    backgroundColor: '#22C55E',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {},
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  searchFilterIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },

  // Banner
  bannerSection: {
    paddingTop: 20,
  },
  bannerScroll: {},
  bannerScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  bannerCard: {
    width: SCREEN_WIDTH - 40,
    borderRadius: 20,
    padding: 24,
    minHeight: 160,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerEmoji: {
    fontSize: 64,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  bannerDotActive: {
    width: 24,
    backgroundColor: '#22C55E',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
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
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },

  // Categories - ✅ THÊM STYLES MỚI
  categoryLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  categoryEmpty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  categoryEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoriesContainer: {
    gap: 16,
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
  },
  categoryGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    alignItems: 'center',
    width: '22%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },

  // Flash Sale
  flashSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flashSaleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flashSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  flashSaleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  countdownTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownBox: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countdownNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  countdownSeparator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Products Scroll
  productsScrollContent: {
    gap: 12,
  },
  productCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  productBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    gap: 4,
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  hotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  productImageContainer: {
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    minHeight: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    color: '#6B7280',
  },
  addToCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },

  // Featured Grid
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featuredCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  featuredImageContainer: {
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredInfo: {
    padding: 12,
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    minHeight: 32,
  },
  featuredPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 10,
  },
  featuredAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  featuredAddBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  featuredAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Promo Banner
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  promoTextContainer: {},
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});