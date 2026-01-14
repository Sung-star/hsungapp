// services/otpService.ts - OTP Service với EmailJS

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit 
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
const MAX_ATTEMPTS = 5; // Số lần thử tối đa

// ==========================================
// EMAILJS CONFIGURATION
// ==========================================
// Đăng ký tại: https://www.emailjs.com/
// 1. Tạo Email Service (Gmail)
// 2. Tạo Email Template
// 3. Lấy các keys bên dưới

const EMAILJS_CONFIG = {
  serviceId: 'service_i3q3ltd',      // Thay bằng Service ID của bạn
  templateId: 'template_rp75sno',    // Thay bằng Template ID của bạn
  publicKey: 'JXKY9q48_xi8EMuml',      // Thay bằng Public Key của bạn
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email via EmailJS
 */
const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.serviceId,
        template_id: EMAILJS_CONFIG.templateId,
        user_id: EMAILJS_CONFIG.publicKey,
        template_params: {
          to_email: email,
          otp_code: otp,
          expiry_minutes: OTP_EXPIRY_MINUTES,
          app_name: 'MyApp', // Tên app của bạn
        },
      }),
    });

    if (response.ok) {
      console.log('✅ Email sent successfully');
      return true;
    } else {
      console.error('❌ EmailJS error:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

/**
 * Invalidate old OTPs for this email
 */
const invalidateOldOTPs = async (email: string): Promise<void> => {
  try {
    const q = query(
      collection(db, OTP_COLLECTION),
      where('email', '==', email.toLowerCase()),
      where('verified', '==', false)
    );

    const snapshot = await getDocs(q);
    
    const updates = snapshot.docs.map(docSnapshot =>
      updateDoc(doc(db, OTP_COLLECTION, docSnapshot.id), { verified: true })
    );

    await Promise.all(updates);
  } catch (error) {
    console.error('Error invalidating old OTPs:', error);
  }
};

/**
 * Check rate limit - không cho gửi quá nhiều OTP trong thời gian ngắn
 */
const checkRateLimit = async (email: string): Promise<{ allowed: boolean; waitSeconds: number }> => {
  try {
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    const q = query(
      collection(db, OTP_COLLECTION),
      where('email', '==', email.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const lastOTP = snapshot.docs[0].data();
      const createdAt = lastOTP.createdAt instanceof Timestamp 
        ? lastOTP.createdAt.toDate() 
        : new Date(lastOTP.createdAt);
      
      const timeDiff = (new Date().getTime() - createdAt.getTime()) / 1000;
      
      if (timeDiff < 60) {
        return { allowed: false, waitSeconds: Math.ceil(60 - timeDiff) };
      }
    }

    return { allowed: true, waitSeconds: 0 };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, waitSeconds: 0 };
  }
};

/**
 * Send OTP to email
 */
export const sendOTP = async ({ 
  email, 
  type 
}: SendOTPParams): Promise<{ 
  success: boolean; 
  message: string;
  waitSeconds?: number;
}> => {
  try {
    // Check rate limit
    const { auth } = await import('@/config/firebase');
    const rateLimit = await checkRateLimit(email);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Vui lòng đợi ${rateLimit.waitSeconds} giây trước khi gửi lại`,
        waitSeconds: rateLimit.waitSeconds,
      };
    }

    // Invalidate old OTPs
    await invalidateOldOTPs(email);

    // Generate new OTP
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
      attempts: 0,
    };

    await addDoc(collection(db, OTP_COLLECTION), otpData);

    // ==========================================
    // SEND EMAIL
    // ==========================================
    // Option 1: Dùng EmailJS (uncomment khi đã config)
    // const emailSent = await sendOTPEmail(email, otp);
    // if (!emailSent) {
    //   return { success: false, message: 'Không thể gửi email. Vui lòng thử lại.' };
    // }

    // Option 2: Development - Log OTP to console
    console.log('========================================');
    console.log('🔐 OTP Code:', otp);
    console.log('📧 Email:', email);
    console.log('⏰ Expires in:', OTP_EXPIRY_MINUTES, 'minutes');
    console.log('========================================');

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
export const verifyOTP = async ({ 
  email, 
  otp 
}: VerifyOTPParams): Promise<OTPVerificationResult> => {
  try {
    // Tìm OTP chưa verified cho email này
    const q = query(
      collection(db, OTP_COLLECTION),
      where('email', '==', email.toLowerCase()),
      where('verified', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        success: false,
        message: 'Không tìm thấy OTP. Vui lòng gửi lại.',
      };
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data() as OTPRequest;

    // Check số lần thử
    if ((otpData.attempts || 0) >= MAX_ATTEMPTS) {
      await updateDoc(doc(db, OTP_COLLECTION, otpDoc.id), { verified: true });
      return {
        success: false,
        message: 'Đã vượt quá số lần thử. Vui lòng gửi OTP mới.',
      };
    }

    // Check OTP có đúng không
    if (otpData.otp !== otp) {
      // Tăng số lần thử
      await updateDoc(doc(db, OTP_COLLECTION, otpDoc.id), {
        attempts: (otpData.attempts || 0) + 1,
      });
      
      const remainingAttempts = MAX_ATTEMPTS - (otpData.attempts || 0) - 1;
      return {
        success: false,
        message: `OTP không đúng. Còn ${remainingAttempts} lần thử.`,
      };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = otpData.expiresAt instanceof Timestamp 
      ? otpData.expiresAt.toDate() 
      : new Date(otpData.expiresAt);

    if (now > expiresAt) {
      return {
        success: false,
        message: 'OTP đã hết hạn. Vui lòng gửi OTP mới.',
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
      message: 'Lỗi xác thực OTP. Vui lòng thử lại.',
    };
  }
};

/**
 * Check if email has pending OTP
 */
export const hasPendingOTP = async (email: string): Promise<boolean> => {
  try {
    const now = new Date();
    const q = query(
      collection(db, OTP_COLLECTION),
      where('email', '==', email.toLowerCase()),
      where('verified', '==', false)
    );

    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt instanceof Timestamp 
        ? data.expiresAt.toDate() 
        : new Date(data.expiresAt);
      
      if (now < expiresAt) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking pending OTP:', error);
    return false;
  }
};