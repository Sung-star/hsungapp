// types/otp.ts - OTP Type Definitions

export type OTPType = 'password_reset' | 'email_verification' | 'phone_verification';

export interface OTPRequest {
  id?: string;
  email: string;
  otp: string;
  type: OTPType;
  expiresAt: Date;
  createdAt: Date;
  verified: boolean;
  attempts?: number; // Số lần thử sai
}

export interface SendOTPParams {
  email: string;
  type: OTPType;
}

export interface VerifyOTPParams {
  email: string;
  otp: string;
}

export interface OTPVerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

export interface UseOTPReturn {
  loading: boolean;
  error: string | null;
  countdown: number;
  canResend: boolean;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<OTPVerificationResult>;
  resetError: () => void;
}
