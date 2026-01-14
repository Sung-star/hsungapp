// app/client/chat.tsx - Client Chat Screen (FIXED)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';
import { Message } from '@/types/chat';
import {
  getOrCreateConversation,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
} from '@/services/chatService';
import ChatBubble from '@/components/chat/ChatBubble';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientChatScreen() {
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  // Initialize conversation
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initConversation = async () => {
      try {
        const convId = await getOrCreateConversation(
          user.uid,
          user.displayName || 'Khách hàng',
          user.email || ''
        );
        setConversationId(convId);
      } catch (error) {
        console.error('Error initializing conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [user]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId || !user) return;

    console.log('🔔 Client subscribing to messages:', conversationId);

    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      console.log('📬 Client received messages:', newMessages.length);
      setMessages(newMessages);
      
      // Mark as read for client (isAdmin = false)
      markMessagesAsRead(conversationId, user.uid, false);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  // Auto scroll to bottom when new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !user || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendMessage({
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || 'Khách hàng',
        senderAvatar: user.photoURL || '',
        senderType: 'client', // ← QUAN TRỌNG: Client gửi = 'client'
        content: text,
        type: 'text',
      });
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // Quick actions
  const quickActions = [
    { icon: 'help-circle', text: 'Hỗ trợ đơn hàng', message: 'Tôi cần hỗ trợ về đơn hàng' },
    { icon: 'cube', text: 'Hỏi về sản phẩm', message: 'Tôi muốn hỏi về sản phẩm' },
    { icon: 'pricetag', text: 'Tư vấn mua hàng', message: 'Tôi cần tư vấn mua hàng' },
  ];

  const handleQuickAction = async (message: string) => {
    if (!conversationId || !user) return;

    setSending(true);
    try {
      await sendMessage({
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || 'Khách hàng',
        senderAvatar: user.photoURL || '',
        senderType: 'client', // ← Client gửi
        content: message,
        type: 'text',
      });
    } catch (error) {
      console.error('Error sending quick message:', error);
    } finally {
      setSending(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hỗ trợ</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        
        <View style={styles.loginPrompt}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.loginTitle}>Đăng nhập để chat</Text>
          <Text style={styles.loginSubtitle}>
            Vui lòng đăng nhập để liên hệ với chúng tôi
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Hỗ trợ khách hàng</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Đang hoạt động</Text>
            </View>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContent}>
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="chatbubbles" size={48} color="#22C55E" />
                </View>
                <Text style={styles.welcomeTitle}>Xin chào! 👋</Text>
                <Text style={styles.welcomeSubtitle}>
                  Chúng tôi sẵn sàng hỗ trợ bạn. Hãy chọn một chủ đề hoặc gửi tin nhắn.
                </Text>

                <View style={styles.quickActions}>
                  {quickActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickActionBtn}
                      onPress={() => handleQuickAction(action.message)}
                      disabled={sending}
                    >
                      <Ionicons name={action.icon as any} size={24} color="#22C55E" />
                      <Text style={styles.quickActionText}>{action.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={({ item }) => (
                  <ChatBubble
                    message={item}
                    // ✅ FIX: Xác định isOwn dựa trên senderType, KHÔNG phải senderId
                    // Tin nhắn của client (senderType='client') sẽ hiện bên phải
                    // Tin nhắn của admin (senderType='admin') sẽ hiện bên trái
                    isOwn={item.senderType === 'client'}
                  />
                )}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
                onLayout={() =>
                  flatListRef.current?.scrollToEnd({ animated: false })
                }
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Input */}
        <View style={[
          styles.inputContainer,
          Platform.OS === 'ios' && { paddingBottom: Math.max(insets.bottom, 12) }
        ]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BBF7D0', marginRight: 6 },
  onlineText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  
  content: { flex: 1 },
  innerContent: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },
  
  welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  welcomeIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  quickActions: { width: '100%', gap: 12 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  quickActionText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  
  inputContainer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F3F4F6', borderRadius: 24, paddingLeft: 16, paddingRight: 4, paddingVertical: 4, minHeight: 48 },
  textInput: { flex: 1, fontSize: 15, color: '#1F2937', maxHeight: 100, paddingVertical: 10, paddingRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#D1D5DB' },
  
  loginPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loginTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  loginButton: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});