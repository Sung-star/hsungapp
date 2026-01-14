// app/chats/[id].tsx - Admin Chat Detail Screen (FIXED)

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import {
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  updateConversationStatus,
} from '@/services/chatService';
import { uploadImage } from '@/services/uploadService';
import { Conversation, Message, SendMessageParams } from '@/types/chat';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const user = auth.currentUser;

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      showSub.remove();
    };
  }, []);

  // Load conversation info
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const docRef = doc(db, 'conversations', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConversation({
            id: docSnap.id,
            userId: data.userId,
            userName: data.userName || 'Khách hàng',
            userAvatar: data.userAvatar || '',
            userEmail: data.userEmail || '',
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
            lastSenderType: data.lastSenderType || 'client',
            userUnread: data.userUnread || 0,
            adminUnread: data.adminUnread || 0,
            status: data.status || 'active',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversation();
  }, [id]);

  // Subscribe to messages
  useEffect(() => {
    if (!id) return;

    console.log('🔔 Admin subscribing to messages:', id);

    const unsubscribe = subscribeToMessages(id as string, (newMessages) => {
      console.log('📬 Admin received messages:', newMessages.length);
      setMessages(newMessages);
      setLoading(false);
      
      // Mark messages as read for admin (isAdmin = true)
      if (user) {
        markMessagesAsRead(id as string, user.uid, true);
      }
    });

    return () => {
      console.log('🔕 Unsubscribing from messages');
      unsubscribe();
    };
  }, [id, user]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isAtBottom]);

  const handleSend = async (
    content: string,
    type: 'text' | 'image' = 'text',
    imageUrl?: string
  ): Promise<boolean> => {
    if (!user || !conversation?.id) return false;

    const params: SendMessageParams = {
      conversationId: conversation.id,
      senderId: user.uid,
      senderName: 'Hỗ trợ viên',
      senderAvatar: user.photoURL || '',
      senderType: 'admin', // ← QUAN TRỌNG: Admin gửi = 'admin'
      content,
      type,
      imageUrl,
    };

    const result = await sendMessage(params);
    if (result) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return result !== null;
  };

  const handleImageUpload = async (uri: string, base64?: string): Promise<string | null> => {
    return await uploadImage({ uri, base64 }, 'chat');
  };

  const handleCloseConversation = () => {
    showConfirmDialog(
      'Đóng cuộc trò chuyện',
      'Bạn có chắc muốn đóng cuộc trò chuyện này?',
      async () => {
        if (!conversation?.id) return;
        const success = await updateConversationStatus(conversation.id, 'closed');
        if (success) {
          setConversation(prev => prev ? { ...prev, status: 'closed' } : null);
          showAlert('Thành công', 'Đã đóng cuộc trò chuyện');
        }
      }
    );
  };

  const handleReopenConversation = async () => {
    if (!conversation?.id) return;
    const success = await updateConversationStatus(conversation.id, 'active');
    if (success) {
      setConversation(prev => prev ? { ...prev, status: 'active' } : null);
      showAlert('Thành công', 'Đã mở lại cuộc trò chuyện');
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setIsAtBottom(isBottom);
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/orders/${orderId}` as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đang tải...</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => setShowInfoModal(true)}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.userName || 'Khách hàng'}
          </Text>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              { backgroundColor: conversation?.status === 'active' ? '#BBF7D0' : '#D1D5DB' }
            ]} />
            <Text style={styles.statusText}>
              {conversation?.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowInfoModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Closed Banner */}
      {conversation?.status === 'closed' && (
        <View style={styles.closedBanner}>
          <Ionicons name="lock-closed" size={16} color="#6B7280" />
          <Text style={styles.closedBannerText}>Cuộc trò chuyện đã đóng</Text>
          <TouchableOpacity onPress={handleReopenConversation}>
            <Text style={styles.reopenText}>Mở lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContent}>
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={({ item }) => (
                  <ChatBubble
                    message={item}
                    // ✅ FIX: Admin nhìn thấy tin nhắn của admin (senderType='admin') ở bên phải
                    // Tin nhắn của client (senderType='client') ở bên trái
                    isOwn={item.senderType === 'admin'}
                    onOrderPress={handleOrderPress}
                  />
                )}
                contentContainerStyle={styles.messagesList}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onContentSizeChange={() => {
                  if (isAtBottom) {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onLayout={() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }}
              />
            )}

            {/* Scroll to bottom button */}
            {!isAtBottom && messages.length > 0 && (
              <TouchableOpacity
                style={styles.scrollToBottom}
                onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
              >
                <Ionicons name="chevron-down" size={20} color="#22C55E" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Input */}
        <View style={[
          styles.inputWrapper,
          Platform.OS === 'ios' && { paddingBottom: Math.max(insets.bottom, 8) }
        ]}>
          {conversation?.status === 'active' ? (
            <ChatInput
              onSend={handleSend}
              onImageUpload={handleImageUpload}
              placeholder="Trả lời khách hàng..."
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
          ) : (
            <View style={styles.closedInput}>
              <Text style={styles.closedInputText}>
                Mở lại cuộc trò chuyện để tiếp tục
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin khách hàng</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tên</Text>
                  <Text style={styles.infoValue}>{conversation?.userName || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{conversation?.userEmail || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bắt đầu chat</Text>
                  <Text style={styles.infoValue}>
                    {conversation?.createdAt?.toLocaleDateString('vi-VN') || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="chatbubbles-outline" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Số tin nhắn</Text>
                  <Text style={styles.infoValue}>{messages.length}</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              {conversation?.status === 'active' ? (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.closeBtn]}
                  onPress={() => {
                    setShowInfoModal(false);
                    handleCloseConversation();
                  }}
                >
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>Đóng cuộc trò chuyện</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.reopenBtn]}
                  onPress={() => {
                    setShowInfoModal(false);
                    handleReopenConversation();
                  }}
                >
                  <Ionicons name="lock-open" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>Mở lại cuộc trò chuyện</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  menuButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: 40 },
  
  closedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 10, gap: 8 },
  closedBannerText: { fontSize: 13, color: '#6B7280' },
  reopenText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },
  
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { flex: 1 },
  innerContent: { flex: 1 },
  messagesList: { paddingVertical: 16, paddingHorizontal: 12, paddingBottom: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  
  scrollToBottom: { position: 'absolute', right: 16, bottom: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  
  inputWrapper: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  closedInput: { padding: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closedInputText: { fontSize: 14, color: '#6B7280' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  infoSection: { gap: 16, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF' },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#1F2937', marginTop: 2 },
  modalActions: { gap: 12 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  closeBtn: { backgroundColor: '#EF4444' },
  reopenBtn: { backgroundColor: '#22C55E' },
  modalBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});