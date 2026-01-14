// app/client/favorites.tsx - 🎨 Fixed & Redesigned

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

interface FavoriteProduct {
  id: string;
  productId: string;
  name: string;          // hoặc productName
  price: number;         // hoặc productPrice
  imageUrl: string;      // hoặc productImage
  category: string;      // hoặc productCategory
  createdAt?: Date;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);

      const favList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          productId: data.productId,
          // ✅ FIX: Hỗ trợ cả 2 tên field (cũ và mới)
          name: data.name || data.productName || 'Sản phẩm',
          price: data.price || data.productPrice || 0,
          imageUrl: data.imageUrl || data.productImage || '',
          category: data.category || data.productCategory || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      }) as FavoriteProduct[];

      // Sắp xếp theo thời gian thêm mới nhất
      favList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

      setFavorites(favList);
      console.log('✅ Loaded favorites:', favList.length);
    } catch (err) {
      console.error('❌ Error loading favorites:', err);
      showAlert('Lỗi', 'Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, []);

  const handleRemoveFavorite = (favorite: FavoriteProduct) => {
    showConfirmDialog(
      'Xóa khỏi yêu thích',
      `Bạn có chắc muốn xóa "${favorite.name}" khỏi danh sách yêu thích?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'favorites', favorite.id));
          setFavorites(prev => prev.filter(f => f.id !== favorite.id));
          showAlert('Thành công', 'Đã xóa khỏi yêu thích');
        } catch (err) {
          console.error('Error removing favorite:', err);
          showAlert('Lỗi', 'Không thể xóa sản phẩm');
        }
      }
    );
  };

  const formatPrice = (amount: number) => 
    new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Thực phẩm': '🍎', 'Đồ uống': '🥤', 'Snack': '🍿',
      'Sữa': '🥛', 'Vệ sinh': '🧼', 'Gia vị': '🧂',
    };
    return emojis[category] || '📦';
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteProduct }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/client/product/${item.productId}`)}
      activeOpacity={0.9}
    >
      {/* Remove Button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFavorite(item)}
      >
        <Ionicons name="heart" size={22} color="#EF4444" />
      </TouchableOpacity>

      {/* Image */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>{getCategoryEmoji(item.category)}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.productInfo}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sản phẩm yêu thích</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Vui lòng đăng nhập</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Yêu thích</Text>
            {favorites.length > 0 && (
              <Text style={styles.headerSubtitle}>{favorites.length} sản phẩm</Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
          <Text style={styles.emptyText}>
            Nhấn vào biểu tượng ❤️ trên sản phẩm để thêm vào danh sách yêu thích
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/client/products')}
          >
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.shopButtonGradient}>
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text style={styles.shopButtonText}>Khám phá ngay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavoriteItem}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6B7280' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  
  shopButton: { borderRadius: 14, overflow: 'hidden' },
  shopButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  shopButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },

  loginButton: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },

  listContent: { padding: 12 },
  row: { justifyContent: 'space-between' },

  productCard: { 
    flex: 1, 
    backgroundColor: 'white', 
    borderRadius: 16, 
    margin: 6, 
    maxWidth: '48%',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3,
    overflow: 'hidden',
  },

  removeButton: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 4, 
    elevation: 5 
  },

  imageContainer: { height: 140, backgroundColor: '#F3F4F6' },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 48 },

  productInfo: { padding: 12 },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  categoryText: { fontSize: 10, fontWeight: '600', color: '#22C55E' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8, minHeight: 36 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
});