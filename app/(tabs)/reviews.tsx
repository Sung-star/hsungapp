// app/(tabs)/reviews.tsx - Admin Reviews Management

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import {
  getAllReviews,
  getPendingReviews,
  approveReview,
  rejectReview,
  replyToReview,
  deleteReview,
} from '@/services/reviewService';
import { Review } from '@/types/review';
import ReviewItem from '@/components/reviews/ReviewItem';

type FilterType = 'all' | 'pending' | 'approved';

const AdminReviewsScreen = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Reply Modal
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [allReviews, pendingReviews] = await Promise.all([
        getAllReviews(),
        getPendingReviews(),
      ]);

      setReviews(allReviews);
      setStats({
        total: allReviews.length,
        pending: pendingReviews.length,
        approved: allReviews.filter(r => r.isApproved).length,
      });
    } catch (error) {
      console.error('Error loading reviews:', error);
      showAlert('Lỗi', 'Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  }, []);

  const filteredReviews = reviews.filter(review => {
    if (filter === 'pending') return !review.isApproved;
    if (filter === 'approved') return review.isApproved;
    return true;
  });

  const handleApprove = async (reviewId: string) => {
    try {
      const result = await approveReview(reviewId);
      if (result.success) {
        showAlert('Thành công', 'Đã duyệt đánh giá');
        loadReviews();
      } else {
        showAlert('Lỗi', result.message);
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể duyệt đánh giá');
    }
  };

  const handleReject = async (reviewId: string) => {
    showConfirmDialog(
      'Ẩn đánh giá',
      'Bạn có chắc muốn ẩn đánh giá này?',
      async () => {
        try {
          const result = await rejectReview(reviewId);
          if (result.success) {
            showAlert('Thành công', 'Đã ẩn đánh giá');
            loadReviews();
          } else {
            showAlert('Lỗi', result.message);
          }
        } catch (error) {
          showAlert('Lỗi', 'Không thể ẩn đánh giá');
        }
      }
    );
  };

  const handleOpenReply = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    setSelectedReviewId(reviewId);
    setReplyText(review?.adminReply || '');
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReviewId) return;
    if (!replyText.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    setSubmitting(true);
    try {
      const result = await replyToReview(selectedReviewId, replyText.trim());
      if (result.success) {
        showAlert('Thành công', 'Đã gửi phản hồi');
        setShowReplyModal(false);
        setReplyText('');
        setSelectedReviewId(null);
        loadReviews();
      } else {
        showAlert('Lỗi', result.message);
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể gửi phản hồi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (reviewId: string) => {
    showConfirmDialog(
      'Xóa đánh giá',
      'Bạn có chắc muốn xóa đánh giá này? Hành động này không thể hoàn tác.',
      async () => {
        try {
          const result = await deleteReview(reviewId);
          if (result.success) {
            showAlert('Thành công', 'Đã xóa đánh giá');
            loadReviews();
          } else {
            showAlert('Lỗi', result.message);
          }
        } catch (error) {
          showAlert('Lỗi', 'Không thể xóa đánh giá');
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đánh giá</Text>
        <Text style={styles.headerSubtitle}>Duyệt và phản hồi đánh giá</Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#667eea' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Chờ duyệt</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statValue}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Đã duyệt</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'Tất cả', count: stats.total },
          { key: 'pending', label: 'Chờ duyệt', count: stats.pending },
          { key: 'approved', label: 'Đã duyệt', count: stats.approved },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
            onPress={() => setFilter(item.key as FilterType)}
          >
            <Text style={[styles.filterTabText, filter === item.key && styles.filterTabTextActive]}>
              {item.label}
            </Text>
            <View style={[styles.filterBadge, filter === item.key && styles.filterBadgeActive]}>
              <Text style={[styles.filterBadgeText, filter === item.key && styles.filterBadgeTextActive]}>
                {item.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reviews List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.reviewItemWrapper}>
              <ReviewItem
                review={item}
                isAdmin
                onApprove={handleApprove}
                onReject={handleReject}
                onReply={handleOpenReply}
                onDelete={handleDelete}
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có đánh giá nào</Text>
            </View>
          }
        />
      )}

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Phản hồi đánh giá</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Nhập phản hồi của bạn..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{replyText.length}/500</Text>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmitReply}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Gửi phản hồi</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  reviewItemWrapper: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  replyInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    height: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AdminReviewsScreen;