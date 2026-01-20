// types/payment.ts - Payment Type Definitions (Updated with VietQR)

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

/**
 * Thông tin ngân hàng cho chuyển khoản
 */
export interface BankInfo {
  bankName: string;
  bankShortName: string;
  accountNumber: string;
  accountName: string;
  content: string; // Nội dung chuyển khoản
}

/**
 * Payment record
 */
export interface Payment {
  id?: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  bankCode?: string;
  qrCodeUrl?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  // Thông tin ngân hàng (cho bank_transfer)
  bankInfo?: BankInfo | null;
  // Admin fields
  adminConfirmed?: boolean;
  adminNote?: string;
  confirmedAt?: Date;
  adminRejected?: boolean;
  rejectReason?: string;
  rejectedAt?: Date;
}

export interface CreatePaymentParams {
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
}

export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  fee: number; // Phí giao dịch (%)
  enabled: boolean;
}

// Danh sách phương thức thanh toán
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cod',
    name: 'Thanh toán khi nhận hàng',
    description: 'Thanh toán bằng tiền mặt khi nhận hàng',
    icon: 'cash-outline',
    fee: 0,
    enabled: true,
  },
  {
    id: 'bank_transfer',
    name: 'Chuyển khoản ngân hàng',
    description: 'Quét QR VietQR để thanh toán',
    icon: 'qr-code-outline',
    fee: 0,
    enabled: true,
  },
  {
    id: 'momo',
    name: 'Ví MoMo',
    description: 'Thanh toán qua ví điện tử MoMo',
    icon: 'wallet-outline',
    fee: 1.5,
    enabled: true,
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    description: 'Thanh toán qua VNPay QR',
    icon: 'card-outline',
    fee: 1.1,
    enabled: true,
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    description: 'Thanh toán qua ví ZaloPay',
    icon: 'phone-portrait-outline',
    fee: 1.2,
    enabled: false, // Chưa tích hợp
  },
];

/**
 * Thông tin tài khoản ngân hàng của shop
 * @deprecated Use SHOP_BANK_ACCOUNT from config/bankConfig.ts instead
 */
export const BANK_ACCOUNT = {
  bankName: 'Vietcombank',
  accountNumber: '01042005',
  accountName: 'TA VAN HOAI SUNG',
  branch: 'Chi nhánh Hồ Chí Minh',
};

/**
 * Helper functions
 */
export const getPaymentMethodName = (method: PaymentMethod): string => {
  const names: Record<PaymentMethod, string> = {
    cod: 'Thanh toán khi nhận hàng',
    bank_transfer: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
    vnpay: 'VNPay',
    zalopay: 'ZaloPay',
  };
  return names[method] || method;
};

export const getPaymentStatusName = (status: PaymentStatus): string => {
  const names: Record<PaymentStatus, string> = {
    pending: 'Chờ thanh toán',
    processing: 'Đang xử lý',
    success: 'Thành công',
    failed: 'Thất bại',
    cancelled: 'Đã hủy',
  };
  return names[status] || status;
};

export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors: Record<PaymentStatus, string> = {
    pending: '#F59E0B',
    processing: '#3B82F6',
    success: '#22C55E',
    failed: '#EF4444',
    cancelled: '#6B7280',
  };
  return colors[status] || '#6B7280';
};

export const getPaymentMethodIcon = (method: PaymentMethod): string => {
  const icons: Record<PaymentMethod, string> = {
    cod: 'cash-outline',
    bank_transfer: 'qr-code-outline',
    momo: 'wallet-outline',
    vnpay: 'card-outline',
    zalopay: 'phone-portrait-outline',
  };
  return icons[method] || 'card-outline';
};