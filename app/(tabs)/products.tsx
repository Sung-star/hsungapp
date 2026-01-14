// app/(tabs)/products.tsx - Admin Products Fresh Market Theme

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
} from 'react-native';
import { deleteProduct, getAllProducts } from '@/firebase/productService';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  sold?: number;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Rau củ', label: 'Rau củ' },
    { key: 'Trái cây', label: 'Trái cây' },
    { key: 'Thịt', label: 'Thịt' },
    { key: 'Hải sản', label: 'Hải sản' },
    { key: 'Đồ uống', label: 'Đồ uống' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error(error);
      showAlert('Lỗi', 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, []);

  const handleDelete = (id: string, name: string) => {
    showConfirmDialog(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa sản phẩm "${name}"?`,
      async () => {
        try {
          await deleteProduct(id);
          await loadProducts();
          showAlert('Thành công', 'Đã xóa sản phẩm');
        } catch (error) {
          showAlert('Lỗi', 'Không thể xóa sản phẩm');
        }
      }
    );
  };

  const stats = {
    total: products.length,
    lowStock: products.filter((p) => p.stock < 10).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLowStock = item.stock < 10;
    const isOutOfStock = item.stock === 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/products/${item.id}`)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} style={styles.productImage} />

        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Hết hàng</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.productCategory}>{item.category}</Text>

          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <View style={[styles.stockBadge, isLowStock && styles.stockBadgeLow, isOutOfStock && styles.stockBadgeOut]}>
              <Ionicons name="cube-outline" size={14} color={isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#22C55E'} />
              <Text style={[styles.stockText, isLowStock && styles.stockTextLow, isOutOfStock && styles.stockTextOut]}>
                {item.stock}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => router.push(`/products/edit/${item.id}`)}>
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id, item.name)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý sản phẩm</Text>
        <Text style={styles.headerSubtitle}>{stats.total} sản phẩm</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="cube" size={18} color="white" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats.lowStock}</Text>
            <Text style={styles.statLabel}>Sắp hết</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>Hết hàng</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
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
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === item.key && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text style={[styles.categoryText, selectedCategory === item.key && styles.categoryTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => router.push('/products/add')}>
              <Text style={styles.addFirstBtnText}>Thêm sản phẩm đầu tiên</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/products/add')} activeOpacity={0.8}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, marginTop: 16, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: 'white' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },

  searchContainer: { paddingHorizontal: 20, paddingTop: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, height: 52, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', marginLeft: 10 },

  categoriesContainer: { paddingTop: 12 },
  categoriesList: { paddingHorizontal: 20, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  categoryChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  categoryTextActive: { color: 'white' },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  productCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  productImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  productName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937', marginRight: 8 },
  outOfStockBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  outOfStockText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },
  productCategory: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stockBadgeOut: { backgroundColor: '#FEE2E2' },
  stockText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },
  stockTextLow: { color: '#F59E0B' },
  stockTextOut: { color: '#EF4444' },

  actions: { justifyContent: 'center', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  editBtn: { backgroundColor: '#DBEAFE' },
  deleteBtn: { backgroundColor: '#FEE2E2' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  addFirstBtn: { marginTop: 20, backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  addFirstBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },

  fab: { position: 'absolute', bottom: 90, right: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabGradient: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});