// components/payment/PaymentMethodSelector.tsx - Fixed props

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod, PAYMENT_METHODS } from '@/types/payment';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;  // ← Đổi từ selectedMethod
  onSelect: (method: PaymentMethod) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const enabledMethods = PAYMENT_METHODS.filter(m => m.enabled);

  return (
    <View style={styles.container}>
      {enabledMethods.map((method) => {
        const isSelected = selected === method.id;
        
        return (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, isSelected && styles.methodCardSelected]}
            onPress={() => onSelect(method.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={isSelected ? '#fff' : '#667eea'}
              />
            </View>
            
            <View style={styles.methodInfo}>
              <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
                {method.name}
              </Text>
              <Text style={styles.methodDescription} numberOfLines={1}>
                {method.description}
              </Text>
              {method.fee > 0 && (
                <Text style={styles.methodFee}>Phí: {method.fee}%</Text>
              )}
            </View>
            
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: {
    borderColor: '#667eea',
    backgroundColor: '#F5F7FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#667eea',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  methodNameSelected: {
    color: '#667eea',
  },
  methodDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  methodFee: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
    fontWeight: '500',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#667eea',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#667eea',
  },
});

export default PaymentMethodSelector;