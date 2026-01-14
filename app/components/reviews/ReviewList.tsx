// components/reviews/ReviewList.tsx - Danh sách đánh giá

import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Review } from '@/types/review';
import ReviewItem from './ReviewItem';

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
  isAdmin?: boolean;
  emptyMessage?: string;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onReply?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  loading = false,
  isAdmin = false,
  emptyMessage = 'Chưa có đánh giá nào',
  onApprove,
  onReject,
  onReply,
  onDelete,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id || Math.random().toString()}
      renderItem={({ item }) => (
        <ReviewItem
          review={item}
          isAdmin={isAdmin}
          onApprove={onApprove}
          onReject={onReject}
          onReply={onReply}
          onDelete={onDelete}
        />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  listContainer: {
    paddingVertical: 8,
  },
});

export default ReviewList;