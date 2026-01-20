// services/paymentService.ts - Complete Payment Service with VietQR Integration

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
  limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Payment, PaymentMethod, PaymentStatus } from '@/types/payment';
import { 
  generateVietQRUrl, 
  generateEWalletQRUrl,
  SHOP_BANK_ACCOUNT,
  removeVietnameseTones,
} from '@/config/bankConfig';

const PAYMENTS_COLLECTION = 'payments';

// ==================== HELPERS ====================

/**
 * Convert Firestore doc to Payment object
 */
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
  paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate() : data.paidAt ? new Date(data.paidAt) : undefined,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
  metadata: data.metadata || {},
  // Thêm thông tin ngân hàng
  bankInfo: data.bankInfo || null,
});

/**
 * Generate unique transaction ID
 */
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// ==================== QR CODE GENERATION ====================

/**
 * Generate QR Code URL based on payment method
 * - bank_transfer: VietQR thật (quét được bằng app ngân hàng)
 * - momo/vnpay/zalopay: Mock QR (demo)
 */
export const generateQRCode = (
  method: PaymentMethod,
  amount: number,
  transactionId: string
): string => {
  if (method === 'bank_transfer') {
    // VietQR thật - quét được bằng mọi app ngân hàng
    return generateVietQRUrl(amount, transactionId, 'compact2');
  }
  
  // Mock QR cho ví điện tử (demo)
  return generateEWalletQRUrl(method as 'momo' | 'vnpay' | 'zalopay', amount, transactionId);
};

/**
 * Legacy function - giữ lại để tương thích ngược
 * @deprecated Use generateQRCode instead
 */
export const generateMockQRCode = (
  method: PaymentMethod,
  amount: number,
  transactionId: string
): string => {
  return generateQRCode(method, amount, transactionId);
};

// ==================== CRUD OPERATIONS ====================

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
    const qrCodeUrl = generateQRCode(method, amount, transactionId);

    const paymentData: any = {
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
      metadata: {},
    };

    // Thêm thông tin ngân hàng nếu là chuyển khoản
    if (method === 'bank_transfer') {
      paymentData.bankInfo = {
        bankName: SHOP_BANK_ACCOUNT.bankName,
        bankShortName: SHOP_BANK_ACCOUNT.bankShortName,
        accountNumber: SHOP_BANK_ACCOUNT.accountNumber,
        accountName: SHOP_BANK_ACCOUNT.accountName,
        content: transactionId, // Nội dung chuyển khoản
      };
    }

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
  additionalData?: Record<string, any>
): Promise<boolean> => {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...additionalData,
    };

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

// ==================== QUERY FUNCTIONS ====================

/**
 * Lấy tất cả payments (cho Admin)
 */
export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => convertToPayment(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting all payments:', error);
    return [];
  }
};

/**
 * Lấy payments theo trạng thái (cho Admin)
 */
export const getPaymentsByStatus = async (status: PaymentStatus): Promise<Payment[]> => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => convertToPayment(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting payments by status:', error);
    return [];
  }
};

/**
 * Lấy payments của user (cho User - Payment History)
 */
export const getUserPayments = async (userId: string): Promise<Payment[]> => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => convertToPayment(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting user payments:', error);
    return [];
  }
};

/**
 * Lấy payments pending (chờ xác nhận) cho Admin
 */
export const getPendingPayments = async (): Promise<Payment[]> => {
  return getPaymentsByStatus('pending');
};

/**
 * Đếm số payments theo trạng thái
 */
export const countPaymentsByStatus = async (): Promise<Record<PaymentStatus, number>> => {
  try {
    const payments = await getAllPayments();
    
    const counts: Record<PaymentStatus, number> = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
    };

    payments.forEach((p) => {
      if (p.status in counts) {
        counts[p.status]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('❌ Error counting payments:', error);
    return {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
    };
  }
};

/**
 * Tính tổng doanh thu từ payments thành công
 */
export const calculateTotalRevenue = async (): Promise<number> => {
  try {
    const successPayments = await getPaymentsByStatus('success');
    return successPayments.reduce((sum, p) => sum + p.amount, 0);
  } catch (error) {
    console.error('❌ Error calculating revenue:', error);
    return 0;
  }
};

/**
 * Admin xác nhận thanh toán thủ công
 */
export const adminConfirmPayment = async (
  paymentId: string,
  adminNote?: string
): Promise<boolean> => {
  try {
    return await updatePaymentStatus(paymentId, 'success', {
      adminConfirmed: true,
      adminNote: adminNote || 'Đã xác nhận bởi admin',
      confirmedAt: new Date(),
    });
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    return false;
  }
};

/**
 * Admin từ chối thanh toán
 */
export const adminRejectPayment = async (
  paymentId: string,
  reason?: string
): Promise<boolean> => {
  try {
    return await updatePaymentStatus(paymentId, 'failed', {
      adminRejected: true,
      rejectReason: reason || 'Không xác nhận được giao dịch',
      rejectedAt: new Date(),
    });
  } catch (error) {
    console.error('❌ Error rejecting payment:', error);
    return false;
  }
};

// ==================== STATISTICS ====================

/**
 * Thống kê thanh toán theo ngày (7 ngày gần nhất)
 */
export const getPaymentStatsByDay = async (): Promise<{
  date: string;
  count: number;
  amount: number;
}[]> => {
  try {
    const payments = await getAllPayments();
    const stats: Record<string, { count: number; amount: number }> = {};

    // Lấy 7 ngày gần nhất
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      stats[dateStr] = { count: 0, amount: 0 };
    }

    // Đếm payments
    payments.forEach((p) => {
      if (p.status === 'success' && p.createdAt) {
        const dateStr = p.createdAt.toISOString().split('T')[0];
        if (stats[dateStr]) {
          stats[dateStr].count++;
          stats[dateStr].amount += p.amount;
        }
      }
    });

    return Object.entries(stats).map(([date, data]) => ({
      date,
      ...data,
    }));
  } catch (error) {
    console.error('❌ Error getting payment stats:', error);
    return [];
  }
};

/**
 * Thống kê theo phương thức thanh toán
 */
export const getPaymentStatsByMethod = async (): Promise<{
  method: PaymentMethod;
  count: number;
  amount: number;
}[]> => {
  try {
    const payments = await getAllPayments();
    const stats: Record<PaymentMethod, { count: number; amount: number }> = {
      cod: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
      momo: { count: 0, amount: 0 },
      vnpay: { count: 0, amount: 0 },
      zalopay: { count: 0, amount: 0 },
    };

    payments.forEach((p) => {
      if (p.status === 'success' && stats[p.method]) {
        stats[p.method].count++;
        stats[p.method].amount += p.amount;
      }
    });

    return Object.entries(stats).map(([method, data]) => ({
      method: method as PaymentMethod,
      ...data,
    }));
  } catch (error) {
    console.error('❌ Error getting payment stats by method:', error);
    return [];
  }
};