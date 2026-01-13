// services/otpService.ts - OTP Service

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  OTPRequest, 
  OTPVerificationResult, 
  SendOTPParams, 
  VerifyOTPParams 
} from '@/types/otp';

const OTP_COLLECTION = 'otpRequests';
const OTP_EXPIRY_MINUTES = 5;

/**
 * Generate 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to email
 * NOTE: Email sending requires Firebase Cloud Functions or external API
 */
export const sendOTP = async ({ email, type }: SendOTPParams): Promise<{ success: boolean; message: string }> => {
  try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Save to Firestore
    const otpData: Omit<OTPRequest, 'id'> = {
      email: email.toLowerCase(),
      otp,
      expiresAt,
      createdAt: new Date(),
      verified: false,
      type,
    };

    await addDoc(collection(db, OTP_COLLECTION), otpData);

    // TODO: Call Cloud Function or API to send email
    // For development, log OTP to console
    console.log('🔐 OTP Generated:', otp);
    console.log('📧 Email:', email);
    console.log('⏰ Expires at:', expiresAt);

    // In production, you would call:
    // await sendOTPEmail(email, otp);

    return {
      success: true,
      message: 'OTP đã được gửi đến email của bạn',
    };
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return {
      success: false,
      message: 'Không thể gửi OTP. Vui lòng thử lại.',
    };
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async ({ email, otp }: VerifyOTPParams): Promise<OTPVerificationResult> => {
  try {
    const q = query(
      collection(db, OTP_COLLECTION),
      where('email', '==', email.toLowerCase()),
      where('otp', '==', otp),
      where('verified', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        success: false,
        message: 'OTP không hợp lệ',
      };
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data() as OTPRequest;

    // Check expiration
    const now = new Date();
    const expiresAt = otpData.expiresAt instanceof Timestamp 
      ? otpData.expiresAt.toDate() 
      : new Date(otpData.expiresAt);

    if (now > expiresAt) {
      return {
        success: false,
        message: 'OTP đã hết hạn',
      };
    }

    // Mark as verified
    await updateDoc(doc(db, OTP_COLLECTION, otpDoc.id), {
      verified: true,
    });

    return {
      success: true,
      message: 'Xác thực OTP thành công',
      email: otpData.email,
    };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    return {
      success: false,
      message: 'Lỗi xác thực OTP',
    };
  }
};

/**
 * Clean up expired OTPs (optional - for maintenance)
 */
export const cleanupExpiredOTPs = async (): Promise<void> => {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, OTP_COLLECTION),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(docSnapshot =>
      updateDoc(doc(db, OTP_COLLECTION, docSnapshot.id), { verified: true })
    );

    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned up ${snapshot.size} expired OTPs`);
  } catch (error) {
    console.error('❌ Error cleaning up OTPs:', error);
  }
};