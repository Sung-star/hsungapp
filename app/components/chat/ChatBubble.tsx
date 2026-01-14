// components/chat/ChatBubble.tsx - Message Bubble Component

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onOrderPress?: (orderId: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn, onOrderPress }) => {
  const formatTime = (date: Date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      delivering: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      preparing: '#8B5CF6',
      delivering: '#06B6D4',
      completed: '#10B981',
      cancelled: '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  return (
    <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
      {/* Avatar (only for other's messages) */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {message.senderAvatar ? (
            <Image source={{ uri: message.senderAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#9CA3AF" />
            </View>
          )}
        </View>
      )}

      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {/* Sender name (only for other's messages) */}
        {!isOwn && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}

        {/* Content based on type */}
        {message.type === 'text' && (
          <Text style={[styles.text, isOwn && styles.textOwn]}>
            {message.content}
          </Text>
        )}

        {message.type === 'image' && message.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: message.imageUrl }} style={styles.image} />
            {message.content && (
              <Text style={[styles.text, isOwn && styles.textOwn, styles.imageCaption]}>
                {message.content}
              </Text>
            )}
          </View>
        )}

        {message.type === 'order' && message.orderData && (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => message.orderId && onOrderPress?.(message.orderId)}
          >
            <View style={styles.orderHeader}>
              <Ionicons name="cube" size={18} color="#667eea" />
              <Text style={styles.orderTitle}>Đơn hàng</Text>
            </View>
            <Text style={styles.orderNumber}>#{message.orderData.orderNumber}</Text>
            <Text style={styles.orderTotal}>
              {formatCurrency(message.orderData.total)}
            </Text>
            <View style={[
              styles.orderStatus,
              { backgroundColor: `${getStatusColor(message.orderData.status)}20` }
            ]}>
              <Text style={[
                styles.orderStatusText,
                { color: getStatusColor(message.orderData.status) }
              ]}>
                {getStatusText(message.orderData.status)}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Time */}
        <View style={styles.timeContainer}>
          <Text style={[styles.time, isOwn && styles.timeOwn]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && (
            <Ionicons
              name={message.isRead ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={message.isRead ? '#10B981' : 'rgba(255,255,255,0.6)'}
              style={styles.readIcon}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleOwn: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  textOwn: {
    color: '#fff',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  imageCaption: {
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    minWidth: 180,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  orderNumber: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  orderStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIcon: {
    marginLeft: 2,
  },
});

export default ChatBubble;