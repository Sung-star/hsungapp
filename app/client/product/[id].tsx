
import { auth, db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
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
} from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string; // ===== FIX =====
  category: string;
  stock: number;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = auth.currentUser;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadProduct();
    checkFavorite();
  }, [id]);

  const loadProduct = async () => {
    try {
      const docRef = doc(db, 'products', id as string);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // ===== FIX map tường minh =====
        setProduct({
          id: docSnap.id,
          name: data.name,
          price: data.price,
          description: data.description,
          imageUrl: data.imageUrl || '',
          category: data.category,
          stock: data.stock,
        });
      }
    } catch (err) {
      console.error('Error loading product:', err);
      Alert.alert('Lỗi', 'Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid),
        where('productId', '==', id)
      );
      const snapshot = await getDocs(q);
      setIsFavorite(!snapshot.empty);
    } catch (err) {
      console.error('Error checking favorite:', err);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }

    try {
      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        productId: id,
        productName: product?.name,
        productImage: product?.imageUrl, // ===== FIX =====
        price: product?.price,
        quantity: quantity,
        createdAt: new Date(),
      });
      Alert.alert('Thành công', 'Đã thêm vào giỏ hàng');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng');
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập');
      return;
    }

    try {
      if (isFavorite) {
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('productId', '==', id)
        );
        const snapshot = await getDocs(q);
        // Delete logic here
        setIsFavorite(false);
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          productId: id,
          name: product?.name,
          price: product?.price,
          imageUrl: product?.imageUrl, // ===== FIX =====
          category: product?.category,
          createdAt: new Date(),
        });
        setIsFavorite(true);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật yêu thích');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy sản phẩm</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>

          <View style={styles.stockInfo}>
            <Ionicons name="checkmark-circle" size={18} color="#43A047" />
            <Text style={styles.stockText}>Còn {product.stock} sản phẩm</Text>
          </View>

          <View style={styles.divider} />

          {/* Quantity Selector */}
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Số lượng:</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#667eea" />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <Ionicons name="add" size={20} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Tổng tiền</Text>
          <Text style={styles.totalPrice}>
            {formatCurrency(product.price * quantity)}
          </Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.addToCartGradient}
          >
            <Ionicons name="cart" size={20} color="white" />
            <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ===== styles GIỮ NGUYÊN 100% ===== */
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 14,
    color: '#43A047',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f6fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 32,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },
  bottomActions: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalContainer: {
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
  },
  addToCartButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
