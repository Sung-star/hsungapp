// components/reviews/ReviewItem.tsx - Fixed image display

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '@/types/review';
import StarRating from './StarRating';

interface ReviewItemProps {
  review: Review;
  isAdmin?: boolean;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onReply?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  isAdmin = false,
  onApprove,
  onReject,
  onReply,
  onDelete,
}) => {
  const [showImages, setShowImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const formatDate = (date: Date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  return (
    <View style={[styles.container, !review.isApproved && styles.containerPending]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.userAvatar ? (
            <Image source={{ uri: review.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.userName}</Text>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={16} />
      </View>

      {/* Status Badge (Admin) */}
      {isAdmin && !review.isApproved && (
        <View style={styles.pendingBadge}>
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text style={styles.pendingText}>Chờ duyệt</Text>
        </View>
      )}

      {/* Comment */}
      <Text style={styles.comment}>{review.comment}</Text>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <View style={styles.imagesContainer}>
          <TouchableOpacity
            style={styles.imagesToggle}
            onPress={() => setShowImages(!showImages)}
          >
            <Ionicons name="images" size={16} color="#667eea" />
            <Text style={styles.imagesToggleText}>
              {showImages ? 'Ẩn ảnh' : `Xem ${review.images.length} ảnh`}
            </Text>
          </TouchableOpacity>
          
          {showImages && (
            <View style={styles.imagesList}>
              {review.images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  {!imageErrors[index] ? (
                    <Image 
                      source={{ uri }} 
                      style={styles.reviewImage}
                      onError={() => handleImageError(index)}
                      // Thêm cho web
                      {...(Platform.OS === 'web' ? { 
                        referrerPolicy: 'no-referrer',
                      } : {})}
                    />
                  ) : (
                    <View style={[styles.reviewImage, styles.imageError]}>
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Admin Reply */}
      {review.adminReply && (
        <View style={styles.adminReply}>
          <View style={styles.replyHeader}>
            <Ionicons name="chatbubble" size={14} color="#667eea" />
            <Text style={styles.replyLabel}>Phản hồi từ Shop</Text>
          </View>
          <Text style={styles.replyText}>{review.adminReply}</Text>
        </View>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <View style={styles.adminActions}>
          {!review.isApproved && onApprove && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => review.id && onApprove(review.id)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Duyệt</Text>
            </TouchableOpacity>
          )}
          
          {review.isApproved && onReject && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => review.id && onReject(review.id)}
            >
              <Ionicons name="eye-off" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Ẩn</Text>
            </TouchableOpacity>
          )}

          {onReply && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.replyBtn]}
              onPress={() => review.id && onReply(review.id)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Trả lời</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => review.id && onDelete(review.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Xóa</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  containerPending: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D97706',
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  imagesContainer: {
    marginTop: 12,
  },
  imagesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imagesToggleText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  imagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  imageError: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminReply: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  replyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  adminActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#F59E0B',
  },
  replyBtn: {
    backgroundColor: '#667eea',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
});

export default ReviewItem;