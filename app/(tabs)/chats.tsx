// app/(tabs)/chats.tsx - Admin Chat List Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  subscribeToConversations,
  getTotalUnreadCount,
} from '@/services/chatService';
import { Conversation } from '@/types/chat';
import ConversationItem from '@/components/chat/ConversationItem';

type FilterType = 'all' | 'active' | 'closed';

export default function AdminChatsScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    console.log('🔔 Subscribing to conversations...');
    
    const unsubscribe = subscribeToConversations((convs) => {
      console.log('📬 Received conversations:', convs.length);
      setConversations(convs);
      setLoading(false);
      
      // Calculate total unread
      const unread = convs.reduce((sum, c) => sum + c.adminUnread, 0);
      setTotalUnread(unread);
    });

    return () => {
      console.log('🔕 Unsubscribing from conversations');
      unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Conversations will auto-refresh via subscription
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chats/${conversation.id}` as any);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'active') return conv.status === 'active';
    if (filter === 'closed') return conv.status === 'closed';
    return true;
  });

  const stats = {
    total: conversations.length,
    active: conversations.filter((c) => c.status === 'active').length,
    closed: conversations.filter((c) => c.status === 'closed').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <Text style={styles.headerSubtitle}>
          {totalUnread > 0 ? `${totalUnread} tin nhắn chưa đọc` : 'Hỗ trợ khách hàng'}
        </Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#667eea' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Đang mở</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#6B7280' }]}>
          <Text style={styles.statValue}>{stats.closed}</Text>
          <Text style={styles.statLabel}>Đã đóng</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'Tất cả', count: stats.total },
          { key: 'active', label: 'Đang mở', count: stats.active },
          { key: 'closed', label: 'Đã đóng', count: stats.closed },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
            onPress={() => setFilter(item.key as FilterType)}
          >
            <Text
              style={[styles.filterTabText, filter === item.key && styles.filterTabTextActive]}
            >
              {item.label}
            </Text>
            {item.count > 0 && (
              <View
                style={[styles.filterBadge, filter === item.key && styles.filterBadgeActive]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    filter === item.key && styles.filterBadgeTextActive,
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleConversationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
            />
          }
          contentContainerStyle={
            filteredConversations.length === 0 ? { flex: 1 } : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
              <Text style={styles.emptySubtext}>
                Tin nhắn từ khách hàng sẽ xuất hiện ở đây
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});