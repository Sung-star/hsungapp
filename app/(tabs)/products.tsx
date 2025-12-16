import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllProducts, deleteProduct } from '@/services/productService';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Format price
  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
  };

  // Load products from Firebase
  useEffect(() => {
    loadProducts();
  }, []);

  // Search filter
  useEffect(() => {
    const filtered = products.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa sản phẩm "${name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(id);
              await loadProducts();
              Alert.alert('Thành công', 'Đã xóa sản phẩm');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/products/${item.id}`)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.productImage}
      />

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productCategory}>{item.category}</Text>

        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>

          <View
            style={[
              styles.stockBadge,
              item.stock < 50 && styles.stockBadgeLow,
            ]}
          >
            <Text
              style={[
                styles.stockText,
                item.stock < 50 && styles.stockTextLow,
              ]}
            >
              Kho: {item.stock}
            </Text>
          </View>
        </View>
      </View>

      {/* Edit / Delete */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/products/edit/${item.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#667eea" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Quản lý sản phẩm</Text>
        <Text style={styles.headerSubtitle}>
          {filteredProducts.length} sản phẩm
        </Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sản phẩm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/products/add')}
      >
        <LinearGradient
          colors={['#43A047', '#66BB6A']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 16 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 16, fontWeight: '600' },
  productCategory: { fontSize: 13, color: '#888' },

  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#43A047' },

  stockBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeLow: { backgroundColor: '#FFEBEE' },
  stockText: { fontSize: 12, color: '#1976D2' },
  stockTextLow: { color: '#D32F2F' },

  actions: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999' },

  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
