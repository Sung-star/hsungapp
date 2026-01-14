// components/payment/QRPaymentModal.tsx - Fixed props

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod, BANK_ACCOUNT } from '@/types/payment';

interface QRPaymentModalProps {
  visible: boolean;
  method: PaymentMethod;
  amount: number;
  transactionId: string;
  qrCodeUrl: string;
  onClose: () => void;
  onConfirmPayment: () => void;
  onCancel: () => void;
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
}) => {
  const [countdown, setCountdown] = useState(300); // 5 phút
  const [confirming, setConfirming] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    setCountdown(300); // Reset countdown

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
  }, [visible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const getMethodName = (m: PaymentMethod) => {
    const names: Record<PaymentMethod, string> = {
      cod: 'COD',
      bank_transfer: 'Chuyển khoản ngân hàng',
      momo: 'Ví MoMo',
      vnpay: 'VNPay',
      zalopay: 'ZaloPay',
    };
    return names[m] || m;
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirmPayment();
    setConfirming(false);
  };

  const isBankTransfer = method === 'bank_transfer';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{getMethodName(method)}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Countdown */}
            <View style={styles.countdownContainer}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={styles.countdownText}>
                Thời gian còn lại:{' '}
                <Text style={styles.countdownValue}>{formatTime(countdown)}</Text>
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Số tiền thanh toán</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              {qrCodeUrl ? (
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={80} color="#D1D5DB" />
                </View>
              )}
            </View>

            {/* Bank Transfer Info */}
            {isBankTransfer && (
              <View style={styles.bankInfo}>
                <Text style={styles.bankInfoTitle}>Thông tin chuyển khoản</Text>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Ngân hàng:</Text>
                  <Text style={styles.bankInfoValue}>{BANK_ACCOUNT.bankName}</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Số tài khoản:</Text>
                  <Text style={styles.bankInfoValue}>{BANK_ACCOUNT.accountNumber}</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Chủ tài khoản:</Text>
                  <Text style={styles.bankInfoValue}>{BANK_ACCOUNT.accountName}</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>Nội dung CK:</Text>
                  <Text style={[styles.bankInfoValue, styles.transferContent]}>
                    {transactionId}
                  </Text>
                </View>
              </View>
            )}

            {/* Transaction ID */}
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionLabel}>Mã giao dịch:</Text>
              <Text style={styles.transactionId}>{transactionId}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.confirmButton, confirming && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Tôi đã thanh toán</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Hủy thanh toán</Text>
              </TouchableOpacity>
            </View>

            {/* Note */}
            <Text style={styles.note}>
              * Vui lòng không đóng màn hình này cho đến khi thanh toán hoàn tất
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  countdownText: {
    fontSize: 14,
    color: '#92400E',
  },
  countdownValue: {
    fontWeight: '700',
    color: '#F59E0B',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#667eea',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  bankInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  bankInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  transferContent: {
    color: '#667eea',
  },
  transactionInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  transactionLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  actions: {
    gap: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default QRPaymentModal;