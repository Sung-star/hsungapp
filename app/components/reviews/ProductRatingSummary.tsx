// components/reviews/ProductRatingSummary.tsx - Tổng quan rating sản phẩm

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProductRating } from '@/types/review';
import StarRating from './StarRating';

interface ProductRatingSummaryProps {
  rating: ProductRating;
}

const ProductRatingSummary: React.FC<ProductRatingSummaryProps> = ({ rating }) => {
  const maxCount = Math.max(...Object.values(rating.ratingCounts), 1);

  return (
    <View style={styles.container}>
      {/* Left: Average Rating */}
      <View style={styles.averageContainer}>
        <Text style={styles.averageNumber}>{rating.averageRating.toFixed(1)}</Text>
        <StarRating rating={rating.averageRating} size={18} />
        <Text style={styles.totalReviews}>{rating.totalReviews} đánh giá</Text>
      </View>

      {/* Right: Rating Bars */}
      <View style={styles.barsContainer}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = rating.ratingCounts[star as 1 | 2 | 3 | 4 | 5];
          const percentage = rating.totalReviews > 0 ? (count / rating.totalReviews) * 100 : 0;

          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${percentage}%` },
                    star >= 4 && styles.barGreen,
                    star === 3 && styles.barYellow,
                    star <= 2 && styles.barRed,
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  averageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minWidth: 100,
  },
  averageNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalReviews: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  barsContainer: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  barLabel: {
    width: 16,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barGreen: {
    backgroundColor: '#10B981',
  },
  barYellow: {
    backgroundColor: '#F59E0B',
  },
  barRed: {
    backgroundColor: '#EF4444',
  },
  barCount: {
    width: 24,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
});

export default ProductRatingSummary;