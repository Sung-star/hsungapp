// components/notifications/EmptyNotifications.tsx - Empty State Component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

// Note: Nếu chưa cài react-native-reanimated, dùng version đơn giản bên dưới

interface EmptyNotificationsProps {
  title?: string;
  message?: string;
}

const EmptyNotifications: React.FC<EmptyNotificationsProps> = ({
  title = 'Không có thông báo',
  message = 'Bạn sẽ nhận được thông báo khi có cập nhật mới',
}) => {
  // Animation (optional - cần react-native-reanimated)
  // const translateY = useSharedValue(0);

  // React.useEffect(() => {
  //   translateY.value = withRepeat(
  //     withSequence(
  //       withTiming(-10, { duration: 1500 }),
  //       withTiming(0, { duration: 1500 })
  //     ),
  //     -1,
  //     true
  //   );
  // }, []);

  // const animatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ translateY: translateY.value }],
  // }));

  return (
    <View style={styles.container}>
      {/* <Animated.View style={[styles.iconWrapper, animatedStyle]}> */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconBackground}>
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
        </View>
        {/* Decorative elements */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>
      {/* </Animated.View> */}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 64,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  circle1: {
    width: 12,
    height: 12,
    top: 8,
    right: 8,
  },
  circle2: {
    width: 8,
    height: 8,
    top: 24,
    left: -4,
  },
  circle3: {
    width: 6,
    height: 6,
    bottom: 16,
    right: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmptyNotifications;
