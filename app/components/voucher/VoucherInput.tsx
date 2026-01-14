// components/voucher/VoucherInput.tsx - Fixed Version with proper types

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { applyVoucher, ApplyVoucherResponse } from '@/services/voucherService';
import { auth } from '@/config/firebase';

interface VoucherInputProps {
  orderSubtotal: number;
  items?: { productId: string; category?: string; quantity: number; price: number }[];
  onVoucherApplied: (response: ApplyVoucherResponse) => void;
  appliedVoucher?: { code: string; discountAmount: number } | null;
  onRemoveVoucher: () => void;
}

export default function VoucherInput({ 
  orderSubtotal, 
  items, 
  onVoucherApplied, 
  appliedVoucher, 
  onRemoveVoucher 
}: VoucherInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = auth.currentUser;

  const handleApply = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) { 
      setError('Vui lòng nhập mã voucher'); 
      return; 
    }
    if (!user) { 
      setError('Vui lòng đăng nhập để sử dụng voucher'); 
      return; 
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await applyVoucher({ 
        code: trimmedCode.toUpperCase(), 
        userId: user.uid, 
        orderSubtotal, 
        items 
      });
      
      if (response.success) { 
        onVoucherApplied(response); 
        setCode(''); 
      } else { 
        setError(response.message); 
      }
    } catch (err: any) { 
      setError(err.message || 'Có lỗi xảy ra khi áp dụng voucher'); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  // Show applied voucher
  if (appliedVoucher) {
    return (
      <View style={styles.appliedContainer}>
        <View style={styles.appliedLeft}>
          <View style={styles.appliedIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
          </View>
          <View style={styles.appliedInfo}>
            <Text style={styles.appliedCode}>{appliedVoucher.code}</Text>
            <Text style={styles.appliedDiscount}>Giảm {formatPrice(appliedVoucher.discountAmount)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemoveVoucher}>
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  // Show input form
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="ticket-outline" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.input} 
            placeholder="Nhập mã voucher" 
            placeholderTextColor="#9CA3AF" 
            value={code} 
            onChangeText={(text) => { setCode(text.toUpperCase()); setError(''); }} 
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleApply}
          />
          {code.length > 0 && (
            <TouchableOpacity onPress={() => setCode('')}>
              <Ionicons name="close-circle" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.applyBtn, loading && styles.applyBtnDisabled]} 
          onPress={handleApply} 
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>Áp dụng</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      
      <Text style={styles.hintText}>
        Nhập mã voucher công khai hoặc mã được tặng riêng cho bạn
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  
  inputRow: { 
    flexDirection: 'row', 
    gap: 10 
  },
  
  inputWrapper: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  input: { 
    flex: 1, 
    paddingVertical: 12, 
    fontSize: 15, 
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: 1,
  },
  
  applyBtn: { 
    backgroundColor: '#22C55E', 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  applyBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  
  applyBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 14 
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  
  errorText: { 
    color: '#EF4444', 
    fontSize: 13,
    flex: 1,
  },
  
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },

  // Applied voucher styles
  appliedContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#F0FDF4', 
    padding: 14, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  appliedIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  appliedInfo: {},
  
  appliedCode: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#166534',
    letterSpacing: 1,
  },
  
  appliedDiscount: { 
    fontSize: 13, 
    color: '#22C55E',
    fontWeight: '600',
    marginTop: 2,
  },
  
  removeBtn: {
    padding: 4,
  },
});