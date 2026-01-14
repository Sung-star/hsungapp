// components/reviews/StarRating.tsx - Component hiển thị và chọn sao

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 20,
  color = '#F59E0B',
  editable = false,
  onRatingChange,
}) => {
  const handlePress = (star: number) => {
    if (editable && onRatingChange) {
      onRatingChange(star);
    }
  };

  const renderStar = (star: number) => {
    const filled = star <= rating;
    const halfFilled = star - 0.5 <= rating && star > rating;

    let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
    if (filled) iconName = 'star';
    else if (halfFilled) iconName = 'star-half';

    const StarComponent = editable ? TouchableOpacity : View;

    return (
      <StarComponent
        key={star}
        onPress={() => handlePress(star)}
        style={styles.starContainer}
        activeOpacity={0.7}
      >
        <Ionicons name={iconName} size={size} color={filled || halfFilled ? color : '#D1D5DB'} />
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map(renderStar)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginHorizontal: 2,
  },
});

export default StarRating;