// hooks/useChat.ts - Chat Hook (FIXED)

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/config/firebase';
import {
  getOrCreateConversation,
  getUserConversation,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
} from '@/services/chatService';
import { Conversation, Message, SendMessageParams } from '@/types/chat';

export const useChat = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const user = auth.currentUser;

  // Initialize conversation
  const initConversation = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // getOrCreateConversation trả về string (conversationId)
      const convId = await getOrCreateConversation(
        user.uid,
        user.displayName || 'Khách hàng',
        user.email || '',
        user.photoURL || ''
      );
      
      setConversationId(convId);
      
      // Lấy conversation object để có thêm thông tin
      const convData = await getUserConversation(user.uid);
      if (convData) {
        setConversation(convData);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to messages when conversationId is ready
  useEffect(() => {
    if (!conversationId || !user) return;

    console.log('🔔 Subscribing to messages for conversation:', conversationId);

    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      console.log('📬 Received messages:', newMessages.length);
      setMessages(newMessages);
      
      // Mark as read for client
      markMessagesAsRead(conversationId, user.uid, false);
    });

    return () => {
      console.log('🔕 Unsubscribing from messages');
      unsubscribe();
    };
  }, [conversationId, user]);

  // Initialize on mount
  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Send message
  const send = async (
    content: string,
    type: 'text' | 'image' | 'order' = 'text',
    imageUrl?: string,
    orderData?: { orderId: string; orderNumber: string; total: number; status: string }
  ): Promise<boolean> => {
    if (!user || !conversationId) return false;

    setSending(true);
    try {
      const params: SendMessageParams = {
        conversationId: conversationId,
        senderId: user.uid,
        senderName: user.displayName || 'Khách hàng',
        senderAvatar: user.photoURL || '',
        senderType: 'client', // Client gửi thì senderType = 'client'
        content,
        type,
        imageUrl,
        orderId: orderData?.orderId,
        orderData: orderData ? {
          orderNumber: orderData.orderNumber,
          total: orderData.total,
          status: orderData.status,
        } : undefined,
      };

      const result = await sendMessage(params);
      return result !== null;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    conversationId,
    conversation,
    messages,
    loading,
    sending,
    send,
    refresh: initConversation,
  };
};