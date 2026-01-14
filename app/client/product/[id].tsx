// app/client/product/[id].tsx - Fixed Version (orderId typo fixed)

import { auth, db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { addDoc, collection, doc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Platform } from 'react-native';
import { showAlert } from '@/utils/platformAlert';
import StarRating from '@/components/reviews/StarRating';
import ProductRatingSummary from '@/components/reviews/ProductRatingSummary';
import ReviewItem from '@/components/reviews/ReviewItem';
import WriteReviewModal from '@/components/reviews/WriteReviewModal';
import { getProductReviews, getProductRating, createReview, canUserReviewProduct } from '@/services/reviewService';
import { Review, ProductRating } from '@/types/review';

interface Product { id: string; name: string; price: number; description: string; imageUrl: string; category: string; stock: number; }

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = auth.currentUser;
  const { addItem, items } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productRating, setProductRating] = useState<ProductRating>({ averageRating: 0, totalReviews: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadProduct(); checkFavorite(); loadReviews(); checkCanReview(); }, [id]);

  const loadProduct = async () => {
    try {
      const docRef = doc(db, 'products', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProduct({ id: docSnap.id, name: data.name, price: data.price, description: data.description, imageUrl: data.imageUrl || '', category: data.category, stock: data.stock });
      }
    } catch (err) { console.error('Error loading product:', err); showAlert('Lỗi', 'Không thể tải sản phẩm'); }
    finally { setLoading(false); }
  };

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const [reviewsData, ratingData] = await Promise.all([getProductReviews(id as string), getProductRating(id as string)]);
      setReviews(reviewsData);
      setProductRating(ratingData);
    } catch (err) { console.error('Error loading reviews:', err); }
    finally { setLoadingReviews(false); }
  };

  const checkCanReview = async () => {
    if (!user) return;
    try {
      const result = await canUserReviewProduct(user.uid, id as string);
      setCanReview(result.canReview);
      if (result.eligibleOrders.length > 0) setEligibleOrderId(result.eligibleOrders[0]);
    } catch (err) { console.error('Error checking review eligibility:', err); }
  };

  const checkFavorite = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) { setIsFavorite(true); setFavoriteDocId(snapshot.docs[0].id); }
      else { setIsFavorite(false); setFavoriteDocId(null); }
    } catch (err) { console.error('Error checking favorite:', err); }
  };

  const handleAddToCart = () => {
    if (!user) { showAlert('Thông báo', 'Vui lòng đăng nhập để thêm vào giỏ hàng'); return; }
    if (!product) return;
    if (product.stock <= 0) { showAlert('Thông báo', 'Sản phẩm đã hết hàng'); return; }
    const cartItem = items.find(item => item.productId === product.id);
    const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
    if (currentQuantityInCart + quantity > product.stock) { showAlert('Thông báo', 'Chỉ còn ' + (product.stock - currentQuantityInCart) + ' sản phẩm có thể thêm'); return; }
    for (let i = 0; i < quantity; i++) { addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category, stock: product.stock }); }
    showAlert('Thành công', 'Đã thêm ' + quantity + ' sản phẩm vào giỏ hàng');
    setQuantity(1);
  };

  const handleToggleFavorite = async () => {
    if (!user) { showAlert('Thông báo', 'Vui lòng đăng nhập'); return; }
    if (!product) return;
    try {
      if (isFavorite && favoriteDocId) {
        await deleteDoc(doc(db, 'favorites', favoriteDocId));
        setIsFavorite(false); setFavoriteDocId(null);
        showAlert('Thành công', 'Đã xóa khỏi yêu thích');
      } else {
        const docRef = await addDoc(collection(db, 'favorites'), { userId: user.uid, productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category, createdAt: new Date() });
        setIsFavorite(true); setFavoriteDocId(docRef.id);
        showAlert('Thành công', 'Đã thêm vào yêu thích');
      }
    } catch (err) { console.error('Error toggling favorite:', err); showAlert('Lỗi', 'Không thể cập nhật yêu thích'); }
  };

  // FIXED: Changed oderId to orderId
  const handleSubmitReview = async (rating: number, comment: string, images: string[]) => {
    if (!user || !eligibleOrderId) return;
    try {
      const result = await createReview({
        productId: id as string,
        userId: user.uid,
        userName: user.displayName || 'Khách hàng',
        userAvatar: user.photoURL || '',
        orderId: eligibleOrderId, // FIXED: was oderId
        rating,
        comment,
        images,
      });
      if (result.success) { showAlert('Thành công', 'Đánh giá của bạn đã được gửi'); setShowReviewModal(false); loadReviews(); checkCanReview(); }
      else { showAlert('Lỗi', result.message); }
    } catch (err) { showAlert('Lỗi', 'Không thể gửi đánh giá'); }
  };

  const onRefresh = async () => { setRefreshing(true); await Promise.all([loadProduct(), loadReviews(), checkCanReview(), checkFavorite()]); setRefreshing(false); };
  const formatPrice = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#22C55E" /></View>;
  if (!product) return <View style={styles.center}><Text style={styles.errorText}>Không tìm thấy sản phẩm</Text></View>;

  const cartItem = items.find(item => item.productId === product.id);
  const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
  const maxQuantityCanAdd = product.stock - currentQuantityInCart;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EF4444' : 'white'} /></TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}>
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <View style={[styles.productImage, styles.imagePlaceholder]}><Ionicons name="image-outline" size={64} color="#D1D5DB" /></View>}

        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{product.category}</Text></View>
          <Text style={styles.productName}>{product.name}</Text>
          <TouchableOpacity style={styles.ratingRow}>
            <StarRating rating={productRating.averageRating} size={18} />
            <Text style={styles.ratingText}>{productRating.averageRating.toFixed(1)} ({productRating.totalReviews} đánh giá)</Text>
          </TouchableOpacity>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          <View style={styles.stockInfo}>
            <View style={[styles.stockDot, { backgroundColor: product.stock > 0 ? '#22C55E' : '#EF4444' }]} />
            <Text style={[styles.stockText, product.stock === 0 && { color: '#EF4444' }]}>{product.stock > 0 ? 'Còn ' + product.stock + ' sản phẩm' : 'Hết hàng'}</Text>
          </View>
          {currentQuantityInCart > 0 && <View style={styles.cartInfo}><Ionicons name="cart" size={16} color="#22C55E" /><Text style={styles.cartInfoText}>Đã có {currentQuantityInCart} sản phẩm trong giỏ hàng</Text></View>}
          <View style={styles.divider} />
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Số lượng:</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(Math.max(1, quantity - 1))}><Ionicons name="remove" size={20} color="#22C55E" /></TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity style={[styles.quantityButton, quantity >= maxQuantityCanAdd && styles.quantityButtonDisabled]} onPress={() => setQuantity(Math.min(maxQuantityCanAdd, quantity + 1))} disabled={quantity >= maxQuantityCanAdd}><Ionicons name="add" size={20} color={quantity >= maxQuantityCanAdd ? "#D1D5DB" : "#22C55E"} /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
          <Text style={styles.description}>{product.description || 'Chưa có mô tả'}</Text>
          <View style={styles.divider} />
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Đánh giá sản phẩm</Text>
              {canReview && <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}><Ionicons name="create-outline" size={18} color="#22C55E" /><Text style={styles.writeReviewText}>Viết đánh giá</Text></TouchableOpacity>}
            </View>
            {productRating.totalReviews > 0 && <ProductRatingSummary rating={productRating} />}
            {loadingReviews ? <View style={styles.loadingReviews}><ActivityIndicator size="small" color="#22C55E" /></View> : reviews.length > 0 ? (
              <View style={styles.reviewsList}>{reviews.slice(0, 5).map((review) => <ReviewItem key={review.id} review={review} />)}</View>
            ) : (
              <View style={styles.noReviews}><Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" /><Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text></View>
            )}
          </View>
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <View style={styles.totalContainer}><Text style={styles.totalLabel}>Tổng tiền</Text><Text style={styles.totalPrice}>{formatPrice(product.price * quantity)}</Text></View>
        <TouchableOpacity style={[styles.addToCartButton, (product.stock === 0 || maxQuantityCanAdd === 0) && styles.addToCartButtonDisabled]} onPress={handleAddToCart} disabled={product.stock === 0 || maxQuantityCanAdd === 0}>
          <LinearGradient colors={product.stock > 0 && maxQuantityCanAdd > 0 ? ['#22C55E', '#16A34A'] : ['#9CA3AF', '#9CA3AF']} style={styles.addToCartGradient}>
            <Ionicons name="cart" size={20} color="white" />
            <Text style={styles.addToCartText}>{product.stock === 0 ? 'Hết hàng' : maxQuantityCanAdd === 0 ? 'Đã đạt tối đa' : 'Thêm vào giỏ'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <WriteReviewModal visible={showReviewModal} productName={product.name} productImage={product.imageUrl} onClose={() => setShowReviewModal(false)} onSubmit={handleSubmitReview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  favoriteButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  productImage: { width: '100%', height: 300, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 20 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
  productName: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  ratingText: { fontSize: 14, color: '#6B7280', flex: 1 },
  productPrice: { fontSize: 24, fontWeight: '700', color: '#22C55E', marginBottom: 12 },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontSize: 14, color: '#22C55E' },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cartInfoText: { fontSize: 13, color: '#22C55E', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quantityButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { opacity: 0.5 },
  quantityValue: { fontSize: 18, fontWeight: '700', color: '#1F2937', minWidth: 32, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24, color: '#6B7280' },
  reviewsSection: { marginTop: 8 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  writeReviewText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },
  loadingReviews: { padding: 40, alignItems: 'center' },
  reviewsList: { gap: 12 },
  noReviews: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#F3F4F6', borderRadius: 12 },
  noReviewsText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  bottomActions: { backgroundColor: 'white', padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalContainer: { marginBottom: 12 },
  totalLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  totalPrice: { fontSize: 24, fontWeight: '700', color: '#22C55E' },
  addToCartButton: { borderRadius: 14, overflow: 'hidden' },
  addToCartButtonDisabled: { opacity: 0.7 },
  addToCartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  addToCartText: { fontSize: 16, fontWeight: '700', color: 'white' },
});