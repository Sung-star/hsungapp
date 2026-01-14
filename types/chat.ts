// types/chat.ts - Chat Type Definitions (FIXED)

export interface Conversation {
  id?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastSenderType: 'client' | 'admin';
  userUnread: number;
  adminUnread: number;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderType: 'client' | 'admin'; // ← QUAN TRỌNG: Dùng để xác định ai gửi
  content: string;
  type: 'text' | 'image' | 'order';
  imageUrl?: string;
  orderId?: string;
  orderData?: {
    orderNumber: string;
    total: number;
    status: string;
  } | null;
  isRead?: boolean;
  readBy?: string[];
  createdAt: Date;
}

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderType: 'client' | 'admin'; // ← Client gửi = 'client', Admin gửi = 'admin'
  content: string;
  type?: 'text' | 'image' | 'order';
  imageUrl?: string;
  orderId?: string;
  orderData?: {
    orderNumber: string;
    total: number;
    status: string;
  } | null;
}