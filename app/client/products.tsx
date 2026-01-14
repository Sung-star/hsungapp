// app/client/products.tsx - 🎨 REDESIGNED Fresh Market Theme (FIXED)

import { db } from '@/config/firebase';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { showAlert } from '@/utils/platformAlert';
import { getProductRating } from '@/services/reviewService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

/* ================= TYPES ================= */
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  stock: number;
  imageUrl?: string;
  averageRating?: number;
  totalReviews?: number;
  isHot?: boolean;
  isNew?: boolean;
  discount?: number;
}

type SortOption = 'newest' | 'price_low' | 'price_high' | 'popular' | 'rating';

/* ================= SCREEN ================= */
export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialCategory = params.category as string || 'all';
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [showInStock, setShowInStock] = useState(false);

  const { addItem, items, getItemCount } = useCart(); // ✅ FIX: Dùng getItemCount()
  const itemCount = getItemCount(); // ✅ FIX

  // Update category when params change
  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category as string);
    }
  }, [params.category]);

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ========== FETCH PRODUCTS ========== */
  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));

      const productsList: Product[] = await Promise.all(
        snapshot.docs.map(async (doc, index) => {
          const data = doc.data();
          
          let averageRating = 0;
          let totalReviews = 0;
          
          try {
            const rating = await getProductRating(doc.id);
            averageRating = rating.averageRating;
            totalReviews = rating.totalReviews;
          } catch (err) {}

          return {
            id: doc.id,
            name: data.name,
            price: data.price,
            originalPrice: data.originalPrice || (index % 4 === 0 ? Math.round(data.price * 1.25) : undefined),
            category: data.category,
            stock: data.stock,
            imageUrl: data.imageUrl || '',
            averageRating,
            totalReviews,
            isHot: index < 3,
            isNew: index >= 3 && index < 6,
            discount: index % 4 === 0 ? Math.floor(Math.random() * 20 + 10) : undefined,
          };
        })
      );

      const uniqueCategories = [...new Set(productsList.map((p) => p.category))];
      setProducts(productsList);
      setCategories(uniqueCategories);
      console.log('✅ Loaded products:', productsList.length);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ========== REFRESH ========== */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
  };

  /* ========== NAVIGATE TO DETAIL ========== */
  const handleProductPress = (productId: string) => {
    router.push(`/client/product/${productId}` as any);
  };

  /* ========== ADD TO CART ========== */
  const handleAddToCart = (product: Product, event: any) => {
    event.stopPropagation();

    if (product.stock <= 0) {
      showAlert('Thông báo', 'Sản phẩm đã hết hàng');
      return;
    }

    const cartItem = items.find((item) => item.productId === product.id);
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

  /* ========== HELPERS ========== */
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Thực phẩm': '🍎',
      'Đồ uống': '🥤',
      'Snack': '🍿',
      'Sữa': '🥛',
      'Vệ sinh': '🧼',
      'Gia vị': '🧂',
      'Bánh kẹo': '🍪',
      'Mì ăn liền': '🍜',
      default: '📦',
    };
    return emojis[category] || emojis.default;
  };

  /* ========== FILTER & SORT ========== */
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchStock = !showInStock || product.stock > 0;
      return matchCategory && matchSearch && matchPrice && matchStock;
    });

    // Sort
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        result.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      default:
        break;
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy, priceRange, showInStock]);

  const sortOptions = [
    { id: 'newest', label: 'Mới nhất', icon: 'time-outline' },
    { id: 'price_low', label: 'Giá thấp → cao', icon: 'trending-up-outline' },
    { id: 'price_high', label: 'Giá cao → thấp', icon: 'trending-down-outline' },
    { id: 'popular', label: 'Phổ biến nhất', icon: 'flame-outline' },
    { id: 'rating', label: 'Đánh giá cao', icon: 'star-outline' },
  ];

  /* ========== UI ========== */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          style={styles.headerGradient}
        >
          {/* Top Bar */}
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Sản phẩm</Text>
            
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={() => router.push('/client/cart')}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#22C55E" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm sản phẩm..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="options-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Category Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'all' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryPillText,
                selectedCategory === 'all' && styles.categoryPillTextActive,
              ]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  selectedCategory === category && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
                <Text style={[
                  styles.categoryPillText,
                  selectedCategory === category && styles.categoryPillTextActive,
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      ) : (
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
          {/* Results Info */}
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsCount}>
              {filteredAndSortedProducts.length} sản phẩm
            </Text>
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="swap-vertical" size={16} color="#6B7280" />
              <Text style={styles.sortButtonText}>
                {sortOptions.find(o => o.id === sortBy)?.label}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Products Grid */}
          {filteredAndSortedProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredAndSortedProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  {/* Badges */}
                  <View style={styles.badgeContainer}>
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
                    {product.isNew && !product.discount && !product.isHot && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newText}>Mới</Text>
                      </View>
                    )}
                  </View>

                  {/* Favorite Button */}
                  <TouchableOpacity style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>

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
                        <Text style={styles.productPlaceholderEmoji}>
                          {getCategoryEmoji(product.category)}
                        </Text>
                      </View>
                    )}
                    
                    {/* Out of Stock Overlay */}
                    {product.stock === 0 && (
                      <View style={styles.outOfStockOverlay}>
                        <Text style={styles.outOfStockText}>Hết hàng</Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.productInfo}>
                    {/* Category Tag */}
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{product.category}</Text>
                    </View>

                    {/* Name */}
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    {/* Rating */}
                    {product.totalReviews && product.totalReviews > 0 ? (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {product.averageRating?.toFixed(1)} ({product.totalReviews})
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star-outline" size={12} color="#D1D5DB" />
                        <Text style={styles.noRatingText}>Chưa có đánh giá</Text>
                      </View>
                    )}

                    {/* Price */}
                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                        {product.originalPrice && (
                          <Text style={styles.originalPrice}>
                            {formatPrice(product.originalPrice)}
                          </Text>
                        )}
                      </View>
                      
                      {/* Add to Cart */}
                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          product.stock === 0 && styles.addButtonDisabled,
                        ]}
                        onPress={(e) => handleAddToCart(product, e)}
                        disabled={product.stock === 0}
                      >
                        <Ionicons
                          name={product.stock > 0 ? 'add' : 'close'}
                          size={20}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Stock */}
                    <View style={styles.stockRow}>
                      <View style={[
                        styles.stockDot,
                        { backgroundColor: product.stock > 5 ? '#22C55E' : product.stock > 0 ? '#F59E0B' : '#EF4444' }
                      ]} />
                      <Text style={styles.stockText}>
                        {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Tạm hết hàng'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
              <Text style={styles.emptyText}>
                Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSortBy('newest');
                }}
              >
                <Text style={styles.resetButtonText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc & Sắp xếp</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sắp xếp theo</Text>
                <View style={styles.sortOptions}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sortOption,
                        sortBy === option.id && styles.sortOptionActive,
                      ]}
                      onPress={() => setSortBy(option.id as SortOption)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={18}
                        color={sortBy === option.id ? '#22C55E' : '#6B7280'}
                      />
                      <Text style={[
                        styles.sortOptionText,
                        sortBy === option.id && styles.sortOptionTextActive,
                      ]}>
                        {option.label}
                      </Text>
                      {sortBy === option.id && (
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* In Stock Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tình trạng</Text>
                <TouchableOpacity
                  style={styles.stockFilter}
                  onPress={() => setShowInStock(!showInStock)}
                >
                  <View style={styles.stockFilterLeft}>
                    <Ionicons 
                      name={showInStock ? "checkbox" : "square-outline"} 
                      size={22} 
                      color={showInStock ? "#22C55E" : "#9CA3AF"} 
                    />
                    <Text style={styles.stockFilterText}>Chỉ hiện còn hàng</Text>
                  </View>
                  <View style={[
                    styles.stockFilterBadge,
                    showInStock && styles.stockFilterBadgeActive
                  ]}>
                    <Text style={[
                      styles.stockFilterBadgeText,
                      showInStock && styles.stockFilterBadgeTextActive
                    ]}>
                      {products.filter(p => p.stock > 0).length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Categories in Modal */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Danh mục</Text>
                <View style={styles.categoryGrid}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      selectedCategory === 'all' && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === 'all' && styles.categoryChipTextActive,
                    ]}>
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={styles.categoryChipEmoji}>{getCategoryEmoji(category)}</Text>
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextActive,
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetFilterButton}
                onPress={() => {
                  setSelectedCategory('all');
                  setSortBy('newest');
                  setShowInStock(false);
                }}
              >
                <Text style={styles.resetFilterButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFilterButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFilterButtonText}>
                  Áp dụng ({filteredAndSortedProducts.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
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
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Category Pills
  categoryPills: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: '#fff',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  categoryPillTextActive: {
    color: '#22C55E',
  },

  // Content
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Results Info
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
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
  newBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  productPlaceholderEmoji: {
    fontSize: 48,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  productInfo: {
    padding: 12,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22C55E',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    minHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noRatingText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#22C55E',
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Filter Sections
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },

  // Sort Options
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: '#DCFCE7',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  sortOptionTextActive: {
    color: '#22C55E',
    fontWeight: '600',
  },

  // Stock Filter
  stockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  stockFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockFilterText: {
    fontSize: 14,
    color: '#4B5563',
  },
  stockFilterBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockFilterBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  stockFilterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  stockFilterBadgeTextActive: {
    color: '#22C55E',
  },

  // Category Grid in Modal
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#DCFCE7',
  },
  categoryChipEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  categoryChipTextActive: {
    color: '#22C55E',
    fontWeight: '600',
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resetFilterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetFilterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyFilterButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  applyFilterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
