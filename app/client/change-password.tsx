// app/client/change-password.tsx - Change Password with OTP Flow

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useOTP } from '@/hooks/useOTP';
import OTPInput from '@/components/otp/OTPInput';

type Step = 'email' | 'otp' | 'password';

const ChangePasswordScreen = () => {
  const router = useRouter();
  const { loading, error, countdown, canResend, sendOTP, verifyOTP, resetError } = useOTP();

  // Form state
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isOTPValid = otp.length === 6;
  const isPasswordValid = newPassword.length >= 8;
  const isPasswordMatch = newPassword === confirmPassword;

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    resetError();
    const success = await sendOTP(email);
    if (success) {
      setStep('otp');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    resetError();
    const result = await verifyOTP(email, otp);
    if (result.success) {
      setStep('password');
    }
  };

  // Step 3: Change Password
  const handleChangePassword = async () => {
    if (!isPasswordValid) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (!isPasswordMatch) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      // Update password
      await updatePassword(user, newPassword);

      // Success
      Alert.alert(
        'Thành công',
        'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await auth.signOut();
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error changing password:', err);
      
      if (err.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Cần xác thực lại',
          'Phiên đăng nhập đã quá lâu. Vui lòng đăng xuất và đăng nhập lại.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Đăng xuất',
              onPress: async () => {
                await auth.signOut();
                router.replace('/auth/login');
              },
            },
          ]
        );
      } else {
        Alert.alert('Lỗi', err.message || 'Không thể đổi mật khẩu');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtp('');
    resetError();
    await sendOTP(email);
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (step) {
      case 'email':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="mail" size={32} color="#3B82F6" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Xác thực email</Text>
            <Text style={styles.stepDescription}>
              Nhập email của bạn để nhận mã OTP
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isEmailValid && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isEmailValid || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={!isEmailValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Gửi OTP</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'otp':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="keypad" size={32} color="#3B82F6" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Nhập mã OTP</Text>
            <Text style={styles.stepDescription}>
              Mã xác thực đã được gửi đến{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <View style={styles.otpContainer}>
              <OTPInput
                value={otp}
                onChange={setOtp}
                error={!!error}
                disabled={loading}
              />
            </View>

            {/* Countdown / Resend */}
            <View style={styles.resendContainer}>
              {!canResend ? (
                <Text style={styles.countdownText}>
                  Gửi lại sau {countdown}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                  <Text style={styles.resendText}>Gửi lại mã OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isOTPValid || loading) && styles.buttonDisabled,
              ]}
              onPress={handleVerifyOTP}
              disabled={!isOTPValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Xác thực</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setStep('email');
                setOtp('');
                resetError();
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.secondaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        );

      case 'password':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="lock-open" size={32} color="#10B981" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Tạo mật khẩu mới</Text>
            <Text style={styles.stepDescription}>
              Mật khẩu phải có ít nhất 8 ký tự
            </Text>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mật khẩu mới"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${Math.min(100, (newPassword.length / 12) * 100)}%`,
                        backgroundColor:
                          newPassword.length < 8
                            ? '#EF4444'
                            : newPassword.length < 12
                            ? '#F59E0B'
                            : '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.strengthText,
                    {
                      color:
                        newPassword.length < 8
                          ? '#EF4444'
                          : newPassword.length < 12
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                >
                  {newPassword.length < 8
                    ? 'Yếu'
                    : newPassword.length < 12
                    ? 'Trung bình'
                    : 'Mạnh'}
                </Text>
              </View>
            )}

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons
                  name={isPasswordMatch ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={isPasswordMatch ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.matchText,
                    { color: isPasswordMatch ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {isPasswordMatch ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: '#10B981' },
                (!isPasswordValid || !isPasswordMatch || isSubmitting) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={!isPasswordValid || !isPasswordMatch || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {['email', 'otp', 'password'].map((s, index) => (
          <React.Fragment key={s}>
            <View
              style={[
                styles.progressStep,
                step === s && styles.progressStepActive,
                ['email', 'otp', 'password'].indexOf(step) > index &&
                  styles.progressStepCompleted,
              ]}
            >
              {['email', 'otp', 'password'].indexOf(step) > index ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.progressStepText,
                    (step === s || ['email', 'otp', 'password'].indexOf(step) > index) &&
                      styles.progressStepTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View
                style={[
                  styles.progressLine,
                  ['email', 'otp', 'password'].indexOf(step) > index &&
                    styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 48,
    backgroundColor: '#FFFFFF',
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: '#3B82F6',
  },
  progressStepCompleted: {
    backgroundColor: '#10B981',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  progressStepTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  stepContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  otpContainer: {
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  resendText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ChangePasswordScreen;
