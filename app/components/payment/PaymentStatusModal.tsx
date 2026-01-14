// components/payment/PaymentStatusModal.tsx - Fixed props

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PaymentStatusModalProps {
  visible: boolean;
  success: boolean;
  message: string;
  transactionId?: string;
  onClose: () => void;
  onViewOrder: () => void;
  onGoHome: () => void;
}

const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  visible,
  success,
  message,
  transactionId,
  onClose,
  onViewOrder,
  onGoHome,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: success ? '#ECFDF5' : '#FEF2F2' },
            ]}
          >
            <Ionicons
              name={success ? 'checkmark-circle' : 'close-circle'}
              size={64}
              color={success ? '#10B981' : '#EF4444'}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Transaction ID */}
          {transactionId && success && (
            <View style={styles.transactionContainer}>
              <Text style={styles.transactionLabel}>Mã giao dịch:</Text>
              <Text style={styles.transactionId}>{transactionId}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onGoHome}>
              <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={onViewOrder}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.primaryGradient}
              >
                <Ionicons name="receipt-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {success ? 'Xem đơn hàng' : 'Thử lại'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  transactionContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  transactionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PaymentStatusModal;