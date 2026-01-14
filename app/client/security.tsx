// app/client/security.tsx - Security Settings Screen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SecurityScreen = () => {
  const router = useRouter();

  const securityOptions = [
    {
      id: 'change-password',
      title: 'Đổi mật khẩu',
      subtitle: 'Đổi mật khẩu qua xác thực OTP email',
      icon: 'key-outline',
      onPress: () => router.push('/client/change-password'),
    },
    {
      id: 'two-factor',
      title: 'Xác thực 2 lớp',
      subtitle: 'Bảo mật tài khoản với xác thực 2 lớp',
      icon: 'shield-checkmark-outline',
      onPress: () => {}, // TODO: Implement
      disabled: true,
      badge: 'Sắp ra mắt',
    },
    {
      id: 'login-history',
      title: 'Lịch sử đăng nhập',
      subtitle: 'Xem các thiết bị đã đăng nhập',
      icon: 'phone-portrait-outline',
      onPress: () => {}, // TODO: Implement
      disabled: true,
      badge: 'Sắp ra mắt',
    },
  ];

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
        <Text style={styles.headerTitle}>Bảo mật</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="shield-checkmark" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.iconTitle}>Bảo mật tài khoản</Text>
          <Text style={styles.iconSubtitle}>
            Quản lý các cài đặt bảo mật của bạn
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {securityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                option.disabled && styles.optionItemDisabled,
              ]}
              onPress={option.onPress}
              disabled={option.disabled}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={option.disabled ? '#9CA3AF' : '#3B82F6'}
                />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text
                    style={[
                      styles.optionTitle,
                      option.disabled && styles.optionTitleDisabled,
                    ]}
                  >
                    {option.title}
                  </Text>
                  {option.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{option.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={option.disabled ? '#D1D5DB' : '#9CA3AF'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
            <Text style={styles.tipTitle}>Mẹo bảo mật</Text>
          </View>
          <Text style={styles.tipText}>
            • Sử dụng mật khẩu mạnh với ít nhất 8 ký tự{'\n'}
            • Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt{'\n'}
            • Không chia sẻ mật khẩu với người khác{'\n'}
            • Thay đổi mật khẩu định kỳ
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  iconSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemDisabled: {
    opacity: 0.6,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionTitleDisabled: {
    color: '#9CA3AF',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  tipsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  tipText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
});

export default SecurityScreen;
