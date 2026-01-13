// types/otp.ts - OTP Type Definitions

export interface OTPRequest {
  id?: string;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  verified: boolean;
  type: 'password-reset' | 'verification';
}

export interface OTPVerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

export interface SendOTPParams {
  email: string;
  type: 'password-reset' | 'verification';
}

export interface VerifyOTPParams {
  email: string;
  otp: string;
}