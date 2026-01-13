// services/passwordService.ts - Password Service

import { 
  updatePassword, 
  signInWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Change password for logged-in user (requires current password)
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return {
        success: false,
        message: 'Người dùng chưa đăng nhập',
      };
    }

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  } catch (error: any) {
    console.error('❌ Error changing password:', error);

    if (error.code === 'auth/wrong-password') {
      return {
        success: false,
        message: 'Mật khẩu hiện tại không đúng',
      };
    }

    if (error.code === 'auth/weak-password') {
      return {
        success: false,
        message: 'Mật khẩu mới quá yếu (tối thiểu 6 ký tự)',
      };
    }

    return {
      success: false,
      message: 'Không thể đổi mật khẩu. Vui lòng thử lại.',
    };
  }
};

/**
 * Reset password after OTP verification (for forgot password flow)
 */
export const resetPasswordWithEmail = async (
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Note: This is a workaround since Firebase doesn't have direct password reset
    // In production, you should use Firebase Admin SDK in Cloud Functions
    
    // For now, we'll use a temporary password approach
    // The user must use the new password to sign in
    
    // This requires Cloud Functions to update password
    // Temporary solution: User must sign in with OTP-verified email first
    
    return {
      success: false,
      message: 'Chức năng này cần Firebase Cloud Functions. Vui lòng liên hệ admin.',
    };
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    return {
      success: false,
      message: 'Không thể đặt lại mật khẩu',
    };
  }
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
    };
  }

  if (password.length > 50) {
    return {
      valid: false,
      message: 'Mật khẩu quá dài (tối đa 50 ký tự)',
    };
  }

  // Check for at least one number (optional, uncomment if needed)
  // if (!/\d/.test(password)) {
  //   return {
  //     valid: false,
  //     message: 'Mật khẩu phải chứa ít nhất 1 số',
  //   };
  // }

  return {
    valid: true,
    message: 'Mật khẩu hợp lệ',
  };
};