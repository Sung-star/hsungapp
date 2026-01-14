// types/voucher.ts - Fixed Version (types only, request/response in service)

export type VoucherType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type VoucherStatus = 'active' | 'inactive' | 'expired';
export type VoucherSource = 'admin_gift' | 'purchase_reward' | 'promotion' | 'referral' | 'new_user';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  totalUsageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  startDate: Date;
  endDate: Date;
  status: VoucherStatus;
  source: VoucherSource;
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludedProducts?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserVoucher {
  id: string;
  userId: string;
  voucherId: string;
  voucherCode: string;
  voucherName: string;
  voucherType: VoucherType;
  voucherValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  usageCount: number;
  usageLimit: number;
  source: VoucherSource;
  sourceDetails?: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt?: Date;
}

export interface VoucherUsage {
  id: string;
  userId: string;
  voucherId: string;
  voucherCode: string;
  orderId: string;
  orderNumber: string;
  discountAmount: number;
  orderTotal: number;
  usedAt: Date;
}

