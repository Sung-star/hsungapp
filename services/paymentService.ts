// services/paymentService.ts - Fixed Complete Version

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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Payment, PaymentMethod, PaymentStatus } from '@/types/payment';

const PAYMENTS_COLLECTION = 'payments';

// Helper: Convert Firestore doc to Payment
const convertToPayment = (id: string, data: any): Payment => ({
  id,
  orderId: data.orderId,
  orderNumber: data.orderNumber,
  userId: data.userId,
  amount: data.amount,
  method: data.method,
  status: data.status,
  transactionId: data.transactionId || '',
  bankCode: data.bankCode || '',
  qrCodeUrl: data.qrCodeUrl || '',
  paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate() : undefined,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  metadata: data.metadata || {},
});

/**
 * Generate transaction ID
 */
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

/**
 * Generate Mock QR Code URL
 */
export const generateMockQRCode = (
  method: PaymentMethod,
  amount: number,
  transactionId: string
): string => {
  const content = encodeURIComponent(
    `${method}|${transactionId}|${amount}`
  );
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${content}`;
};

/**
 * Tạo payment record mới
 */
export const createPayment = async (
  orderId: string,
  orderNumber: string,
  userId: string,
  amount: number,
  method: PaymentMethod
): Promise<Payment | null> => {
  try {
    const transactionId = generateTransactionId();
    const qrCodeUrl = generateMockQRCode(method, amount, transactionId);

    const paymentData = {
      orderId,
      orderNumber,
      userId,
      amount,
      method,
      status: 'pending' as PaymentStatus,
      transactionId,
      qrCodeUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), paymentData);
    console.log('✅ Payment created:', docRef.id);

    return {
      id: docRef.id,
      ...paymentData,
    };
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    return null;
  }
};

/**
 * Lấy payment theo ID
 */
export const getPayment = async (paymentId: string): Promise<Payment | null> => {
  try {
    const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return convertToPayment(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('❌ Error getting payment:', error);
    return null;
  }
};

/**
 * Lấy payment theo orderId
 */
export const getPaymentByOrderId = async (orderId: string): Promise<Payment | null> => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('orderId', '==', orderId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docData = snapshot.docs[0];
    return convertToPayment(docData.id, docData.data());
  } catch (error) {
    console.error('❌ Error getting payment by orderId:', error);
    return null;
  }
};

/**
 * Cập nhật trạng thái payment
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: PaymentStatus,
  transactionId?: string
): Promise<boolean> => {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    if (status === 'success') {
      updateData.paidAt = new Date();
    }

    await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentId), updateData);
    console.log('✅ Payment status updated:', paymentId, status);

    return true;
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    return false;
  }
};

/**
 * Mô phỏng xử lý thanh toán (dùng cho demo/testing)
 */
export const simulatePaymentProcessing = async (
  paymentId: string,
  success: boolean = true
): Promise<{ success: boolean; message: string }> => {
  try {
    if (success) {
      await updatePaymentStatus(paymentId, 'success');
      return {
        success: true,
        message: 'Thanh toán thành công',
      };
    } else {
      await updatePaymentStatus(paymentId, 'failed');
      return {
        success: false,
        message: 'Thanh toán thất bại',
      };
    }
  } catch (error) {
    console.error('❌ Error simulating payment:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra',
    };
  }
};

/**
 * Hủy thanh toán
 */
export const cancelPayment = async (paymentId: string): Promise<boolean> => {
  return updatePaymentStatus(paymentId, 'cancelled');
};