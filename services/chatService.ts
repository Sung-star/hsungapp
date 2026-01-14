// services/chatService.ts - Chat Service (FIXED)

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Conversation, Message, SendMessageParams } from '@/types/chat';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

// ==================== HELPERS ====================

const convertToConversation = (id: string, data: any): Conversation => ({
  id,
  userId: data.userId,
  userName: data.userName || 'Khách hàng',
  userAvatar: data.userAvatar || '',
  userEmail: data.userEmail || '',
  lastMessage: data.lastMessage || '',
  lastMessageTime: data.lastMessageTime instanceof Timestamp 
    ? data.lastMessageTime.toDate() 
    : new Date(data.lastMessageTime || Date.now()),
  lastSenderType: data.lastSenderType || 'client',
  userUnread: data.userUnread || 0,
  adminUnread: data.adminUnread || 0,
  status: data.status || 'active',
  createdAt: data.createdAt instanceof Timestamp 
    ? data.createdAt.toDate() 
    : new Date(data.createdAt || Date.now()),
  updatedAt: data.updatedAt instanceof Timestamp 
    ? data.updatedAt.toDate() 
    : new Date(data.updatedAt || Date.now()),
});

const convertToMessage = (id: string, data: any): Message => ({
  id,
  conversationId: data.conversationId,
  senderId: data.senderId,
  senderName: data.senderName || 'Unknown',
  senderAvatar: data.senderAvatar || '',
  senderType: data.senderType || 'client', // ← Quan trọng
  content: data.content || '',
  type: data.type || 'text',
  imageUrl: data.imageUrl || '',
  orderId: data.orderId || '',
  orderData: data.orderData || null,
  isRead: data.isRead || false,
  createdAt: data.createdAt instanceof Timestamp 
    ? data.createdAt.toDate() 
    : new Date(data.createdAt || Date.now()),
});

// ==================== CONVERSATION ====================

/**
 * Lấy hoặc tạo conversation cho user - Trả về conversation ID (string)
 */
export const getOrCreateConversation = async (
  userId: string,
  userName: string,
  userEmail?: string,
  userAvatar?: string
): Promise<string> => {
  try {
    // Tìm conversation đã tồn tại
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Tạo mới nếu chưa có
    const newConversation = {
      userId,
      userName,
      userAvatar: userAvatar || '',
      userEmail: userEmail || '',
      lastMessage: '',
      lastMessageTime: new Date(),
      lastSenderType: 'client',
      userUnread: 0,
      adminUnread: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), newConversation);
    console.log('✅ Conversation created:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error getting/creating conversation:', error);
    throw error;
  }
};

/**
 * Lấy conversation của user
 */
export const getUserConversation = async (userId: string): Promise<Conversation | null> => {
  try {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    return convertToConversation(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('❌ Error getting user conversation:', error);
    return null;
  }
};

/**
 * Lấy tất cả conversations (Admin)
 */
export const getAllConversations = async (): Promise<Conversation[]> => {
  try {
    const q = query(collection(db, CONVERSATIONS_COLLECTION));
    const snapshot = await getDocs(q);

    const conversations = snapshot.docs.map(docSnap => 
      convertToConversation(docSnap.id, docSnap.data())
    );

    // Sort by lastMessageTime (newest first)
    conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return conversations;
  } catch (error) {
    console.error('❌ Error getting all conversations:', error);
    return [];
  }
};

/**
 * Subscribe to conversations (Admin) - Real-time
 */
export const subscribeToConversations = (
  callback: (conversations: Conversation[]) => void
): Unsubscribe => {
  const q = query(collection(db, CONVERSATIONS_COLLECTION));

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(docSnap => 
      convertToConversation(docSnap.id, docSnap.data())
    );

    conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    callback(conversations);
  });
};

/**
 * Đóng/Mở conversation
 */
export const updateConversationStatus = async (
  conversationId: string,
  status: 'active' | 'closed'
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      status,
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('❌ Error updating conversation status:', error);
    return false;
  }
};

/**
 * Lấy conversation theo ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return convertToConversation(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('❌ Error getting conversation:', error);
    return null;
  }
};

// ==================== MESSAGES ====================

/**
 * Gửi tin nhắn
 * 
 * QUAN TRỌNG: senderType phải được set đúng:
 * - Client gửi: senderType = 'client'
 * - Admin gửi: senderType = 'admin'
 */
export const sendMessage = async (params: SendMessageParams): Promise<Message | null> => {
  try {
    const messageData = {
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar || '',
      senderType: params.senderType, // ← QUAN TRỌNG: 'client' hoặc 'admin'
      content: params.content,
      type: params.type || 'text',
      imageUrl: params.imageUrl || '',
      orderId: params.orderId || '',
      orderData: params.orderData || null,
      isRead: false,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
    console.log('✅ Message sent:', docRef.id, 'senderType:', params.senderType);

    // Update conversation
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, params.conversationId);
    
    const updateData: any = {
      lastMessage: params.type === 'image' ? '📷 Hình ảnh' : 
                   params.type === 'order' ? '📦 Đơn hàng' : params.content,
      lastMessageTime: new Date(),
      lastSenderType: params.senderType,
      updatedAt: new Date(),
    };

    // Tăng unread count cho phía còn lại
    if (params.senderType === 'client') {
      // Client gửi → Admin chưa đọc tăng
      updateData.adminUnread = increment(1);
    } else {
      // Admin gửi → User chưa đọc tăng
      updateData.userUnread = increment(1);
    }

    await updateDoc(conversationRef, updateData);

    return {
      id: docRef.id,
      ...messageData,
    } as Message;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return null;
  }
};

/**
 * Lấy messages của conversation
 */
export const getMessages = async (
  conversationId: string,
  limitCount: number = 50
): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => convertToMessage(docSnap.id, docSnap.data()));
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    return [];
  }
};

/**
 * Subscribe to messages in a conversation - Real-time
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map(docSnap => 
      convertToMessage(docSnap.id, docSnap.data())
    );
    callback(messages);
  });
};

/**
 * Mark messages as read & reset unread counter
 * 
 * @param isAdmin - true nếu admin đang đọc, false nếu client đang đọc
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    if (isAdmin) {
      // Admin đọc → reset adminUnread
      await updateDoc(conversationRef, {
        adminUnread: 0,
        updatedAt: new Date(),
      });
    } else {
      // Client đọc → reset userUnread
      await updateDoc(conversationRef, {
        userUnread: 0,
        updatedAt: new Date(),
      });
    }

    console.log('✅ Messages marked as read, isAdmin:', isAdmin);
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
  }
};

/**
 * Lấy tổng số tin nhắn chưa đọc
 */
export const getTotalUnreadCount = async (
  userId?: string,
  isAdmin: boolean = true
): Promise<number> => {
  try {
    if (isAdmin) {
      const conversations = await getAllConversations();
      return conversations.reduce((total, conv) => total + conv.adminUnread, 0);
    } else if (userId) {
      const conversation = await getUserConversation(userId);
      return conversation?.userUnread || 0;
    }
    return 0;
  } catch (error) {
    console.error('❌ Error getting total unread:', error);
    return 0;
  }
};