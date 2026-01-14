// hooks/useOTP.ts - OTP Hook với countdown và validation

import { useState, useEffect, useCallback, useRef } from 'react';
import { sendOTP, verifyOTP } from '@/services/otpService';
import { OTPVerificationResult, UseOTPReturn } from '@/types/otp';

const RESEND_COOLDOWN = 60; // 60 giây

export const useOTP = (): UseOTPReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [countdown > 0]); // Only re-run when countdown starts/stops

  const handleSendOTP = useCallback(async (email: string): Promise<boolean> => {
    if (!email) {
      setError('Vui lòng nhập email');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await sendOTP({ email, type: 'password_reset' });

      if (result.success) {
        setCountdown(result.waitSeconds || RESEND_COOLDOWN);
        return true;
      } else {
        setError(result.message);
        if (result.waitSeconds) {
          setCountdown(result.waitSeconds);
        }
        return false;
      }
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyOTP = useCallback(async (
    email: string, 
    otp: string
  ): Promise<OTPVerificationResult> => {
    if (!email || !otp) {
      const message = 'Vui lòng nhập đầy đủ thông tin';
      setError(message);
      return { success: false, message };
    }

    if (otp.length !== 6) {
      const message = 'OTP phải có 6 số';
      setError(message);
      return { success: false, message };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyOTP({ email, otp });

      if (!result.success) {
        setError(result.message);
      }

      return result;
    } catch (err) {
      const message = 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    countdown,
    canResend: countdown === 0,
    sendOTP: handleSendOTP,
    verifyOTP: handleVerifyOTP,
    resetError,
  };
};

export default useOTP;
