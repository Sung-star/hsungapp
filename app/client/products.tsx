// app/client/products.tsx
import { db } from '@/config/firebase';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ================= TYPES ================= */
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string; // ✅ ĐỒNG BỘ VỚI ADMIN
}

/* ================= SCREEN ================= */
export default function ProductsScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const { addItem, items } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ========== FETCH PRODUCTS ========== */
  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));

      const productsList: Product[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          price: data.price,
          category: data.category,
          stock: data.stock,
          imageUrl: data.imageUrl || '', // ✅ FIREBASE IMAGE
        };
      });

      const uniqueCategories = [
        ...new Set(productsList.map((p) => p.category)),
      ];

      setProducts(productsList);
      setCategories(uniqueCategories);

      console.log('✅ Loaded products:', productsList.length);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ========== ADD TO CART ========== */
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
      return;
    }

    const cartItem = items.find(
      (item) => item.productId === product.id
    );

    if (cartItem && cartItem.quantity >= product.stock) {
      Alert.alert('Thông báo', 'Đã đạt số lượng tối đa trong kho');
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl, // ✅ TRUYỀN ĐÚNG
      category: product.category,
      stock: product.stock,
    });

    Alert.alert('Thành công', `Đã thêm "${product.name}" vào giỏ hàng`);
  };

  /* ========== HELPERS ========== */
  const formatPrice = (price: number) =>
    price.toLocaleString('vi-VN') + 'đ';

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Nước giải khát': '🥤',
      'Mì ăn liền': '🍜',
      'Bánh kẹo': '🍪',
      'Sữa': '🥛',
      'Bia rượu': '🍺',
      'Gia vị': '🧂',
      'Vệ sinh': '🧼',
      default: '📦',
    };
    return icons[category] || icons.default;
  };

  /* ========== FILTER ========== */
  const filteredProducts = products.filter((product) => {
    const matchCategory =
      selectedCategory === 'all' ||
      product.category === selectedCategory;
    const matchSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  /* ========== UI ========== */
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2ecc71', '#27ae60']} style={styles.header}>
        <Text style={styles.headerTitle}>Sản phẩm</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productImage}>
                  {product.imageUrl ? (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.productImageReal}
                    />
                  ) : (
                    <Text style={styles.productIcon}>
                      {getCategoryIcon(product.category)}
                    </Text>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  <Text style={styles.productPrice}>
                    {formatPrice(product.price)}
                  </Text>

                  <Text
                    style={[
                      styles.productStock,
                      product.stock === 0 && styles.outOfStock,
                    ]}
                  >
                    {product.stock > 0
                      ? `Còn: ${product.stock}`
                      : 'Hết hàng'}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      product.stock === 0 && styles.addButtonDisabled,
                    ]}
                    disabled={product.stock === 0}
                    onPress={() => handleAddToCart(product)}
                  >
                    <Ionicons name="cart-outline" size={16} color="white" />
                    <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '700' },
  searchContainer: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20 },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  productImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  productImageReal: { width: '100%', height: '100%' },
  productIcon: { fontSize: 48 },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '600' },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2ecc71',
  },
  productStock: { fontSize: 12, marginBottom: 8 },
  outOfStock: { color: '#e74c3c' },
  addButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: { backgroundColor: '#bdc3c7' },
  addButtonText: { color: 'white', fontWeight: '600' },
});
