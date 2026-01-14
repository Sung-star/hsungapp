// services/reviewService.ts - Review CRUD Operations

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Review, CreateReviewParams, UpdateReviewParams, ProductRating } from '@/types/review';

const REVIEWS_COLLECTION = 'reviews';

// Helper: Convert Firestore doc to Review
const convertToReview = (id: string, data: any): Review => ({
  id,
  productId: data.productId,
  userId: data.userId,
  userName: data.userName,
  userAvatar: data.userAvatar || '',
  orderId: data.orderId,
  rating: data.rating,
  comment: data.comment,
  images: data.images || [],
  isApproved: data.isApproved ?? true,
  adminReply: data.adminReply || '',
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
});

/**
 * Tạo đánh giá mới
 */
export const createReview = async (params: CreateReviewParams): Promise<{ success: boolean; message: string; reviewId?: string }> => {
  try {
    // Kiểm tra xem user đã đánh giá sản phẩm này trong đơn hàng này chưa
    const existingReview = await checkExistingReview(params.userId, params.productId, params.orderId);
    if (existingReview) {
      return {
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi',
      };
    }

    const reviewData = {
      ...params,
      images: params.images || [],
      isApproved: true, // Auto approve, admin có thể ẩn sau
      adminReply: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), reviewData);
    console.log('✅ Review created:', docRef.id);

    return {
      success: true,
      message: 'Đánh giá thành công',
      reviewId: docRef.id,
    };
  } catch (error) {
    console.error('❌ Error creating review:', error);
    return {
      success: false,
      message: 'Không thể tạo đánh giá',
    };
  }
};

/**
 * Kiểm tra user đã đánh giá chưa
 */
export const checkExistingReview = async (
  userId: string,
  productId: string,
  orderId: string
): Promise<Review | null> => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('userId', '==', userId),
      where('productId', '==', productId),
      where('orderId', '==', orderId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return convertToReview(doc.id, doc.data());
  } catch (error) {
    console.error('❌ Error checking existing review:', error);
    return null;
  }
};

/**
 * Lấy đánh giá theo sản phẩm
 */
export const getProductReviews = async (
  productId: string,
  onlyApproved: boolean = true
): Promise<Review[]> => {
  try {
    let q;
    if (onlyApproved) {
      q = query(
        collection(db, REVIEWS_COLLECTION),
        where('productId', '==', productId),
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, REVIEWS_COLLECTION),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertToReview(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting product reviews:', error);
    return [];
  }
};

/**
 * Lấy đánh giá của user
 */
export const getUserReviews = async (userId: string): Promise<Review[]> => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertToReview(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting user reviews:', error);
    return [];
  }
};

/**
 * Lấy tất cả đánh giá (Admin)
 */
export const getAllReviews = async (limitCount: number = 100): Promise<Review[]> => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertToReview(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting all reviews:', error);
    return [];
  }
};

/**
 * Lấy đánh giá chờ duyệt (Admin)
 */
export const getPendingReviews = async (): Promise<Review[]> => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('isApproved', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertToReview(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting pending reviews:', error);
    return [];
  }
};

/**
 * Cập nhật đánh giá
 */
export const updateReview = async (
  reviewId: string,
  params: UpdateReviewParams
): Promise<{ success: boolean; message: string }> => {
  try {
    const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(reviewRef, {
      ...params,
      updatedAt: new Date(),
    });

    console.log('✅ Review updated:', reviewId);
    return {
      success: true,
      message: 'Cập nhật thành công',
    };
  } catch (error) {
    console.error('❌ Error updating review:', error);
    return {
      success: false,
      message: 'Không thể cập nhật đánh giá',
    };
  }
};

/**
 * Admin duyệt đánh giá
 */
export const approveReview = async (reviewId: string): Promise<{ success: boolean; message: string }> => {
  return updateReview(reviewId, { isApproved: true });
};

/**
 * Admin từ chối/ẩn đánh giá
 */
export const rejectReview = async (reviewId: string): Promise<{ success: boolean; message: string }> => {
  return updateReview(reviewId, { isApproved: false });
};

/**
 * Admin trả lời đánh giá
 */
export const replyToReview = async (
  reviewId: string,
  reply: string
): Promise<{ success: boolean; message: string }> => {
  return updateReview(reviewId, { adminReply: reply });
};

/**
 * Xóa đánh giá
 */
export const deleteReview = async (reviewId: string): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    console.log('✅ Review deleted:', reviewId);
    return {
      success: true,
      message: 'Xóa đánh giá thành công',
    };
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    return {
      success: false,
      message: 'Không thể xóa đánh giá',
    };
  }
};

/**
 * Tính rating trung bình của sản phẩm
 */
export const getProductRating = async (productId: string): Promise<ProductRating> => {
  try {
    const reviews = await getProductReviews(productId, true);
    
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach(review => {
      const rating = review.rating as 1 | 2 | 3 | 4 | 5;
      ratingCounts[rating]++;
      totalRating += review.rating;
    });

    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10, // 1 decimal
      totalReviews: reviews.length,
      ratingCounts,
    };
  } catch (error) {
    console.error('❌ Error getting product rating:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
};

/**
 * Kiểm tra user có thể đánh giá sản phẩm không
 * (Phải mua sản phẩm và đơn hàng đã hoàn thành)
 */
export const canUserReviewProduct = async (
  userId: string,
  productId: string
): Promise<{ canReview: boolean; eligibleOrders: string[] }> => {
  try {
    // Lấy các đơn hàng completed của user có chứa sản phẩm này
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', userId),
      where('status', '==', 'completed')
    );
    const snapshot = await getDocs(q);

    const eligibleOrders: string[] = [];

    for (const orderDoc of snapshot.docs) {
      const orderData = orderDoc.data();
      const items = orderData.items || [];
      
      // Kiểm tra đơn hàng có chứa sản phẩm không
      const hasProduct = items.some((item: any) => item.productId === productId);
      
      if (hasProduct) {
        // Kiểm tra đã đánh giá chưa
        const existingReview = await checkExistingReview(userId, productId, orderDoc.id);
        if (!existingReview) {
          eligibleOrders.push(orderDoc.id);
        }
      }
    }

    return {
      canReview: eligibleOrders.length > 0,
      eligibleOrders,
    };
  } catch (error) {
    console.error('❌ Error checking review eligibility:', error);
    return {
      canReview: false,
      eligibleOrders: [],
    };
  }
};