// types/payment.ts - Payment Type Definitions

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

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
    description: 'Chuyển khoản qua tài khoản ngân hàng',
    icon: 'business-outline',
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
    icon: 'qr-code-outline',
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

// Thông tin tài khoản ngân hàng (cho bank transfer)
export const BANK_ACCOUNT = {
  bankName: 'Vietcombank',
  accountNumber: '1234567890',
  accountName: 'CONG TY ABC',
  branch: 'Chi nhánh Hồ Chí Minh',
};