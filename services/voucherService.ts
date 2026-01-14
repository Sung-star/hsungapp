// services/voucherService.ts - Fixed: Handle undefined values for Firebase

import { db } from '@/config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  Voucher,
  UserVoucher,
  VoucherStatus,
  VoucherSource,
} from '@/types/voucher';

const VOUCHERS_COLLECTION = 'vouchers';
const USER_VOUCHERS_COLLECTION = 'userVouchers';
const VOUCHER_USAGE_COLLECTION = 'voucherUsage';

// ==================== EXPORT TYPES ====================
export interface ApplyVoucherRequest {
  code: string;
  userId: string;
  orderSubtotal: number;
  items?: Array<{ productId: string; category?: string; quantity: number; price: number }>;
}

export interface ApplyVoucherResponse {
  success: boolean;
  message: string;
  voucher?: Voucher | UserVoucher;
  discountAmount: number;
}

// ==================== HELPER: Remove undefined values ====================
const removeUndefined = (obj: any): any => {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

// ==================== ADMIN FUNCTIONS ====================

export const createVoucher = async (
  voucherData: Omit<Voucher, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; message: string; voucherId?: string }> => {
  try {
    const existingQuery = query(
      collection(db, VOUCHERS_COLLECTION),
      where('code', '==', voucherData.code.toUpperCase())
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return { success: false, message: 'Mã voucher đã tồn tại' };
    }

    // Build data object, excluding undefined values
    const dataToSave = removeUndefined({
      code: voucherData.code.toUpperCase(),
      name: voucherData.name,
      description: voucherData.description || '',
      type: voucherData.type,
      value: voucherData.value,
      minOrderValue: voucherData.minOrderValue || 0,
      maxDiscount: voucherData.maxDiscount || null, // Use null instead of undefined
      totalUsageLimit: voucherData.totalUsageLimit || null,
      perUserLimit: voucherData.perUserLimit || 1,
      startDate: voucherData.startDate,
      endDate: voucherData.endDate,
      status: voucherData.status || 'active',
      source: voucherData.source || 'promotion',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const docRef = await addDoc(collection(db, VOUCHERS_COLLECTION), dataToSave);

    return { success: true, message: 'Tạo voucher thành công', voucherId: docRef.id };
  } catch (error) {
    console.error('Error creating voucher:', error);
    return { success: false, message: 'Không thể tạo voucher: ' + (error as Error).message };
  }
};

export const updateVoucher = async (
  voucherId: string,
  updates: Partial<Voucher>
): Promise<{ success: boolean; message: string }> => {
  try {
    const cleanUpdates = removeUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    await updateDoc(doc(db, VOUCHERS_COLLECTION, voucherId), cleanUpdates);
    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) {
    console.error('Error updating voucher:', error);
    return { success: false, message: 'Không thể cập nhật voucher' };
  }
};

export const deleteVoucher = async (voucherId: string): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(db, VOUCHERS_COLLECTION, voucherId));
    return { success: true, message: 'Xóa voucher thành công' };
  } catch (error) {
    console.error('Error deleting voucher:', error);
    return { success: false, message: 'Không thể xóa voucher' };
  }
};

export const getAllVouchers = async (): Promise<Voucher[]> => {
  try {
    const q = query(collection(db, VOUCHERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      startDate: docSnap.data().startDate?.toDate?.() || new Date(docSnap.data().startDate),
      endDate: docSnap.data().endDate?.toDate?.() || new Date(docSnap.data().endDate),
      createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(),
    })) as Voucher[];
  } catch (error) {
    console.error('Error getting vouchers:', error);
    return [];
  }
};

export const getVoucherById = async (voucherId: string): Promise<Voucher | null> => {
  try {
    const docSnap = await getDoc(doc(db, VOUCHERS_COLLECTION, voucherId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startDate: data.startDate?.toDate?.() || new Date(data.startDate),
      endDate: data.endDate?.toDate?.() || new Date(data.endDate),
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Voucher;
  } catch (error) {
    console.error('Error getting voucher:', error);
    return null;
  }
};

export const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
  try {
    const q = query(
      collection(db, VOUCHERS_COLLECTION),
      where('code', '==', code.toUpperCase())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startDate: data.startDate?.toDate?.() || new Date(data.startDate),
      endDate: data.endDate?.toDate?.() || new Date(data.endDate),
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Voucher;
  } catch (error) {
    console.error('Error getting voucher by code:', error);
    return null;
  }
};

export const getVoucherStats = async (): Promise<{
  totalVouchers: number;
  activeVouchers: number;
  totalUsage: number;
  totalDiscount: number;
}> => {
  try {
    const [vouchersSnapshot, usageSnapshot] = await Promise.all([
      getDocs(collection(db, VOUCHERS_COLLECTION)),
      getDocs(collection(db, VOUCHER_USAGE_COLLECTION)),
    ]);

    const vouchers = vouchersSnapshot.docs.map((d) => d.data());
    const activeVouchers = vouchers.filter((v) => v.status === 'active').length;
    const totalUsage = usageSnapshot.size;
    const totalDiscount = usageSnapshot.docs.reduce(
      (sum, d) => sum + (d.data().discountAmount || 0),
      0
    );

    return { totalVouchers: vouchers.length, activeVouchers, totalUsage, totalDiscount };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { totalVouchers: 0, activeVouchers: 0, totalUsage: 0, totalDiscount: 0 };
  }
};

// ==================== GIFT VOUCHER ====================

export const giftVoucherToUser = async (
  userId: string,
  voucherId: string,
  source: VoucherSource = 'admin_gift',
  sourceDetails?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const voucher = await getVoucherById(voucherId);
    if (!voucher) return { success: false, message: 'Voucher không tồn tại' };

    const existingQuery = query(
      collection(db, USER_VOUCHERS_COLLECTION),
      where('userId', '==', userId),
      where('voucherId', '==', voucherId),
      where('isUsed', '==', false)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return { success: false, message: 'Người dùng đã có voucher này' };
    }

    // Remove undefined values before saving
    const dataToSave = removeUndefined({
      userId,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      voucherName: voucher.name,
      voucherType: voucher.type,
      voucherValue: voucher.value,
      maxDiscount: voucher.maxDiscount || null,
      minOrderValue: voucher.minOrderValue || 0,
      usageCount: 0,
      usageLimit: voucher.perUserLimit || 1,
      source,
      sourceDetails: sourceDetails || '',
      expiresAt: Timestamp.fromDate(voucher.endDate),
      isUsed: false,
      createdAt: Timestamp.now(),
    });

    await addDoc(collection(db, USER_VOUCHERS_COLLECTION), dataToSave);

    return { success: true, message: 'Đã tặng voucher thành công' };
  } catch (error) {
    console.error('Error gifting voucher:', error);
    return { success: false, message: 'Không thể tặng voucher' };
  }
};

export const giftVoucherToMultipleUsers = async (
  userIds: string[],
  voucherId: string,
  source: VoucherSource = 'admin_gift',
  sourceDetails?: string
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const oderId of userIds) {
    const result = await giftVoucherToUser(oderId, voucherId, source, sourceDetails);
    if (result.success) success++;
    else failed++;
  }

  return { success, failed };
};

// ==================== CLIENT FUNCTIONS ====================

export const getUserVouchers = async (userId: string): Promise<UserVoucher[]> => {
  try {
    const q = query(
      collection(db, USER_VOUCHERS_COLLECTION),
      where('userId', '==', userId),
      where('isUsed', '==', false)
    );
    const snapshot = await getDocs(q);

    const now = new Date();
    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as UserVoucher;
      })
      .filter((v) => v.expiresAt > now);
  } catch (error) {
    console.error('Error getting user vouchers:', error);
    return [];
  }
};

export const getPublicVouchers = async (): Promise<Voucher[]> => {
  try {
    const now = new Date();
    const q = query(collection(db, VOUCHERS_COLLECTION), where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          endDate: data.endDate?.toDate?.() || new Date(data.endDate),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Voucher;
      })
      .filter((v) => v.startDate <= now && v.endDate >= now);
  } catch (error) {
    console.error('Error getting public vouchers:', error);
    return [];
  }
};

export const applyVoucher = async (request: ApplyVoucherRequest): Promise<ApplyVoucherResponse> => {
  try {
    const { code, userId, orderSubtotal } = request;

    const voucher = await getVoucherByCode(code);

    let userVoucher: UserVoucher | null = null;
    if (!voucher) {
      const userVoucherQuery = query(
        collection(db, USER_VOUCHERS_COLLECTION),
        where('userId', '==', userId),
        where('voucherCode', '==', code.toUpperCase()),
        where('isUsed', '==', false)
      );
      const uvSnapshot = await getDocs(userVoucherQuery);

      if (!uvSnapshot.empty) {
        const uvData = uvSnapshot.docs[0].data();
        userVoucher = {
          id: uvSnapshot.docs[0].id,
          ...uvData,
          expiresAt: uvData.expiresAt?.toDate?.() || new Date(uvData.expiresAt),
          createdAt: uvData.createdAt?.toDate?.() || new Date(),
        } as UserVoucher;
      }
    }

    if (!voucher && !userVoucher) {
      return { success: false, message: 'Mã voucher không hợp lệ', discountAmount: 0 };
    }

    const now = new Date();

    if (voucher) {
      if (voucher.status !== 'active') {
        return { success: false, message: 'Voucher không hoạt động', discountAmount: 0 };
      }
      if (voucher.startDate > now) {
        return { success: false, message: 'Voucher chưa có hiệu lực', discountAmount: 0 };
      }
      if (voucher.endDate < now) {
        return { success: false, message: 'Voucher đã hết hạn', discountAmount: 0 };
      }
      if (voucher.totalUsageLimit && voucher.usageCount >= voucher.totalUsageLimit) {
        return { success: false, message: 'Voucher đã hết lượt sử dụng', discountAmount: 0 };
      }
    }

    if (userVoucher) {
      if (userVoucher.expiresAt < now) {
        return { success: false, message: 'Voucher đã hết hạn', discountAmount: 0 };
      }
      if (userVoucher.usageCount >= userVoucher.usageLimit) {
        return { success: false, message: 'Bạn đã sử dụng hết lượt', discountAmount: 0 };
      }
    }

    const vType = voucher?.type || userVoucher!.voucherType;
    const vValue = voucher?.value || userVoucher!.voucherValue;
    const vMinOrder = voucher?.minOrderValue || userVoucher?.minOrderValue || 0;
    const vMaxDiscount = voucher?.maxDiscount || userVoucher?.maxDiscount;

    if (orderSubtotal < vMinOrder) {
      return {
        success: false,
        message: 'Đơn hàng tối thiểu ' + new Intl.NumberFormat('vi-VN').format(vMinOrder) + 'đ',
        discountAmount: 0,
      };
    }

    let discountAmount = 0;
    if (vType === 'percentage') {
      discountAmount = (orderSubtotal * vValue) / 100;
      if (vMaxDiscount && discountAmount > vMaxDiscount) {
        discountAmount = vMaxDiscount;
      }
    } else if (vType === 'fixed_amount') {
      discountAmount = vValue;
    } else if (vType === 'free_shipping') {
      discountAmount = 30000;
    }

    if (discountAmount > orderSubtotal) {
      discountAmount = orderSubtotal;
    }

    return {
      success: true,
      message: 'Áp dụng voucher thành công',
      voucher: voucher || userVoucher!,
      discountAmount: Math.round(discountAmount),
    };
  } catch (error) {
    console.error('Error applying voucher:', error);
    return { success: false, message: 'Có lỗi xảy ra', discountAmount: 0 };
  }
};

export const confirmVoucherUsage = async (
  userId: string,
  voucherCode: string,
  orderId: string,
  orderNumber: string,
  discountAmount: number,
  orderTotal: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const voucher = await getVoucherByCode(voucherCode);

    const userVoucherQuery = query(
      collection(db, USER_VOUCHERS_COLLECTION),
      where('userId', '==', userId),
      where('voucherCode', '==', voucherCode.toUpperCase()),
      where('isUsed', '==', false)
    );
    const uvSnapshot = await getDocs(userVoucherQuery);

    if (voucher) {
      await updateDoc(doc(db, VOUCHERS_COLLECTION, voucher.id), {
        usageCount: (voucher.usageCount || 0) + 1,
        updatedAt: Timestamp.now(),
      });
    }

    if (!uvSnapshot.empty) {
      const uvDoc = uvSnapshot.docs[0];
      const uvData = uvDoc.data();
      const newUsageCount = (uvData.usageCount || 0) + 1;
      const isFullyUsed = newUsageCount >= (uvData.usageLimit || 1);

      await updateDoc(doc(db, USER_VOUCHERS_COLLECTION, uvDoc.id), {
        usageCount: newUsageCount,
        isUsed: isFullyUsed,
        updatedAt: Timestamp.now(),
      });
    }

    await addDoc(collection(db, VOUCHER_USAGE_COLLECTION), {
      userId,
      voucherId: voucher?.id || '',
      voucherCode: voucherCode.toUpperCase(),
      orderId,
      orderNumber,
      discountAmount,
      orderTotal,
      usedAt: Timestamp.now(),
    });

    return { success: true, message: 'Đã ghi nhận sử dụng voucher' };
  } catch (error) {
    console.error('Error confirming voucher usage:', error);
    return { success: false, message: 'Không thể ghi nhận' };
  }
};