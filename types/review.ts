// types/review.ts - Review Type Definitions

export interface Review {
  id?: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  orderId: string;
  rating: number; // 1-5
  comment: string;
  images: string[];
  isApproved: boolean;
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewParams {
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  orderId: string;
  rating: number;
  comment: string;
  images?: string[];
}

export interface UpdateReviewParams {
  rating?: number;
  comment?: string;
  images?: string[];
  isApproved?: boolean;
  adminReply?: string;
}

export interface ProductRating {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}