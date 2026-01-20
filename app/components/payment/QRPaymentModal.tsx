// components/payment/QRPaymentModal.tsx - FIXED for Mobile Display (Full Screen)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PaymentMethod, BankInfo, BANK_ACCOUNT } from '@/types/payment';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QRPaymentModalProps {
  visible: boolean;
  method: PaymentMethod;
  amount: number;
  transactionId: string;
  qrCodeUrl: string;
  onClose: () => void;
  onConfirmPayment: () => void;
  onCancel: () => void;
  bankInfo?: BankInfo | null;
}

const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  visible,
  method,
  amount,
  transactionId,
  qrCodeUrl,
  onClose,
  onConfirmPayment,
  onCancel,
  bankInfo,
}) => {
  const [countdown, setCountdown] = useState(600);
  const [confirming, setConfirming] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCountdown(600);
      setImageLoading(true);
      setImageError(false);
      setConfirming(false);
      setCopiedField(null);
      console.log('🔓 QRPaymentModal opened, qrCodeUrl:', qrCodeUrl);
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onCancel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  };

  const getMethodConfig = (m: PaymentMethod) => {
    const configs: Record<PaymentMethod, { name: string; color: string; icon: string; gradient: [string, string] }> = {
      cod: { name: 'COD', color: '#22C55E', icon: 'cash', gradient: ['#22C55E', '#16A34A'] },
      bank_transfer: { name: 'Chuyển khoản ngân hàng', color: '#3B82F6', icon: 'business', gradient: ['#3B82F6', '#2563EB'] },
      momo: { name: 'Ví MoMo', color: '#A50064', icon: 'wallet', gradient: ['#A50064', '#8B0055'] },
      vnpay: { name: 'VNPay', color: '#0066CC', icon: 'card', gradient: ['#0066CC', '#0052A3'] },
      zalopay: { name: 'ZaloPay', color: '#0068FF', icon: 'phone-portrait', gradient: ['#0068FF', '#0054CC'] },
    };
    return configs[m] || configs.bank_transfer;
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.log('Copy failed:', error);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmPayment();
    } finally {
      setConfirming(false);
    }
  };

  const config = getMethodConfig(method);
  const isBankTransfer = method === 'bank_transfer';
  
  // Use bankInfo from props or fallback to BANK_ACCOUNT
  const bank = bankInfo || {
    bankName: BANK_ACCOUNT.bankName,
    bankShortName: 'VCB',
    accountNumber: BANK_ACCOUNT.accountNumber,
    accountName: BANK_ACCOUNT.accountName,
    content: transactionId,
  };

  // Don't render if not visible
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: config.gradient[0] }]}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient colors={config.gradient} style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>{config.name}</Text>
              
              <View style={{ width: 40 }} />
            </View>

            <Text style={styles.headerSubtitle}>
              {isBankTransfer ? 'Quét mã QR bằng app ngân hàng' : 'Quét mã QR để thanh toán'}
            </Text>

            {/* Countdown */}
            <View style={styles.countdownContainer}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.countdownText}>
                Thời gian còn lại: <Text style={styles.countdownValue}>{formatTime(countdown)}</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Amount */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Số tiền thanh toán</Text>
              <Text style={[styles.amountValue, { color: config.color }]}>
                {formatCurrency(amount)}
              </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                {imageLoading && !imageError && (
                  <View style={styles.qrLoading}>
                    <ActivityIndicator size="large" color={config.color} />
                    <Text style={styles.qrLoadingText}>Đang tải mã QR...</Text>
                  </View>
                )}
                
                {imageError ? (
                  <View style={styles.qrError}>
                    <Ionicons name="warning-outline" size={48} color="#EF4444" />
                    <Text style={styles.qrErrorText}>Không thể tải mã QR</Text>
                    <Text style={styles.qrErrorHint}>Vui lòng sử dụng thông tin chuyển khoản bên dưới</Text>
                  </View>
                ) : qrCodeUrl ? (
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={[styles.qrImage, imageLoading && styles.hidden]}
                    resizeMode="contain"
                    onLoad={() => {
                      console.log('✅ QR Image loaded successfully');
                      setImageLoading(false);
                    }}
                    onError={(e) => {
                      console.log('❌ QR Image error:', e.nativeEvent.error);
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <View style={styles.qrError}>
                    <Ionicons name="qr-code-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.qrErrorText}>Không có mã QR</Text>
                  </View>
                )}
              </View>

              {isBankTransfer && !imageError && (
                <View style={styles.vietqrBadge}>
                  <Text style={styles.vietqrText}>🇻🇳 VietQR</Text>
                </View>
              )}
            </View>

            {/* Bank Transfer Info */}
            {isBankTransfer && (
              <View style={styles.bankInfoCard}>
                <View style={styles.bankInfoHeader}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.bankInfoTitle}>Hoặc chuyển khoản thủ công</Text>
                </View>

                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Ngân hàng</Text>
                  <Text style={styles.bankInfoValue}>{bank.bankName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.bankInfoRow}
                  onPress={() => handleCopyToClipboard(bank.accountNumber, 'account')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bankInfoLabel}>Số tài khoản</Text>
                  <View style={styles.copyRow}>
                    <Text style={styles.bankInfoValueHighlight}>{bank.accountNumber}</Text>
                    <Ionicons
                      name={copiedField === 'account' ? 'checkmark-circle' : 'copy-outline'}
                      size={18}
                      color={copiedField === 'account' ? '#22C55E' : '#3B82F6'}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Chủ tài khoản</Text>
                  <Text style={styles.bankInfoValue}>{bank.accountName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.bankInfoRow}
                  onPress={() => handleCopyToClipboard(amount.toString(), 'amount')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bankInfoLabel}>Số tiền</Text>
                  <View style={styles.copyRow}>
                    <Text style={styles.bankInfoValueHighlight}>{formatCurrency(amount)}</Text>
                    <Ionicons
                      name={copiedField === 'amount' ? 'checkmark-circle' : 'copy-outline'}
                      size={18}
                      color={copiedField === 'amount' ? '#22C55E' : '#3B82F6'}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bankInfoRow, styles.bankInfoRowLast]}
                  onPress={() => handleCopyToClipboard(transactionId, 'content')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bankInfoLabel}>Nội dung CK</Text>
                  <View style={styles.copyRow}>
                    <Text style={[styles.bankInfoValueHighlight, styles.transferContent]}>
                      {transactionId}
                    </Text>
                    <Ionicons
                      name={copiedField === 'content' ? 'checkmark-circle' : 'copy-outline'}
                      size={18}
                      color={copiedField === 'content' ? '#22C55E' : '#3B82F6'}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.warningText}>
                    Vui lòng nhập chính xác nội dung chuyển khoản để được xác nhận nhanh chóng
                  </Text>
                </View>
              </View>
            )}

            {/* Transaction ID for non-bank transfer */}
            {!isBankTransfer && (
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionLabel}>Mã giao dịch:</Text>
                <Text style={styles.transactionId}>{transactionId}</Text>
              </View>
            )}

            {/* Note */}
            <View style={styles.noteContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.note}>
                Sau khi chuyển khoản thành công, nhấn Tôi đã thanh toán để hoàn tất đơn hàng.
              </Text>
            </View>

            {/* Spacer for buttons */}
            <View style={{ height: 140 }} />
          </ScrollView>

          {/* Fixed Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.confirmButton, confirming && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={confirming}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.confirmButtonGradient}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.confirmButtonText}>Tôi đã thanh toán</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.cancelButtonText}>Hủy thanh toán</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 12,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  countdownText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  countdownValue: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrWrapper: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 252,
    minHeight: 252,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
  qrLoading: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },
  qrError: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrErrorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  qrErrorHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  hidden: {
    opacity: 0,
    position: 'absolute',
  },
  vietqrBadge: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  vietqrText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bankInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bankInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bankInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bankInfoRowLast: {
    borderBottomWidth: 0,
  },
  bankInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bankInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankInfoValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  transferContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  transactionInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
  },
  note: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  confirmButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default QRPaymentModal;