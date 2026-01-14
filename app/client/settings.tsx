// app/client/settings.tsx - User Settings Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { NotificationSettings } from '@/types/notification';

const defaultSettings: NotificationSettings = {
  notifications: true,
  emailNotifications: true,
  orderUpdates: true,
  promotions: false,
};

const SettingsScreen = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'userSettings', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      } else {
        await setDoc(docRef, defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      setSaving(true);
      const docRef = doc(db, 'userSettings', user.uid);
      await updateDoc(docRef, { [key]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
      setSettings(settings);
      Alert.alert('Lỗi', 'Không thể cập nhật cài đặt. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleMasterToggle = (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Tắt thông báo?',
        'Bạn sẽ không nhận được bất kỳ thông báo nào từ ứng dụng.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Tắt',
            style: 'destructive',
            onPress: () => updateSetting('notifications', false),
          },
        ]
      );
    } else {
      updateSetting('notifications', true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.placeholder}>
          {saving && <ActivityIndicator size="small" color="#3B82F6" />}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="notifications"
                  size={22}
                  color={settings.notifications ? '#3B82F6' : '#9CA3AF'}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Thông báo trong app</Text>
                <Text style={styles.settingDescription}>Bật/tắt tất cả thông báo</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={handleMasterToggle}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={settings.notifications ? '#3B82F6' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.settingItem, !settings.notifications && styles.settingItemDisabled]}>
              <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="cube-outline" size={22} color={settings.notifications && settings.orderUpdates ? '#3B82F6' : '#9CA3AF'} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, !settings.notifications && styles.settingTitleDisabled]}>
                  Cập nhật đơn hàng
                </Text>
                <Text style={styles.settingDescription}>Thông báo trạng thái đơn hàng</Text>
              </View>
              <Switch
                value={settings.orderUpdates}
                onValueChange={(value) => updateSetting('orderUpdates', value)}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={settings.orderUpdates ? '#3B82F6' : '#F3F4F6'}
                disabled={!settings.notifications}
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.settingItem, !settings.notifications && styles.settingItemDisabled]}>
              <View style={[styles.settingIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="gift-outline" size={22} color={settings.notifications && settings.promotions ? '#F59E0B' : '#9CA3AF'} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, !settings.notifications && styles.settingTitleDisabled]}>
                  Khuyến mãi
                </Text>
                <Text style={styles.settingDescription}>Ưu đãi, mã giảm giá mới</Text>
              </View>
              <Switch
                value={settings.promotions}
                onValueChange={(value) => updateSetting('promotions', value)}
                trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                thumbColor={settings.promotions ? '#F59E0B' : '#F3F4F6'}
                disabled={!settings.notifications}
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.settingItem, !settings.notifications && styles.settingItemDisabled]}>
              <View style={[styles.settingIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="mail-outline" size={22} color={settings.notifications && settings.emailNotifications ? '#10B981' : '#9CA3AF'} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, !settings.notifications && styles.settingTitleDisabled]}>
                  Thông báo email
                </Text>
                <Text style={styles.settingDescription}>Gửi thông báo qua email</Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={(value) => updateSetting('emailNotifications', value)}
                trackColor={{ false: '#E5E7EB', true: '#6EE7B7' }}
                thumbColor={settings.emailNotifications ? '#10B981' : '#F3F4F6'}
                disabled={!settings.notifications}
              />
            </View>
          </View>

          {!settings.notifications && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.infoText}>
                Bạn đã tắt thông báo. Bật lại để không bỏ lỡ các cập nhật quan trọng.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khác</Text>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/client/security')}>
              <View style={[styles.settingIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Bảo mật</Text>
                <Text style={styles.settingDescription}>Đổi mật khẩu, xác thực 2 lớp</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={22} color="#6B7280" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Chính sách bảo mật</Text>
                <Text style={styles.settingDescription}>Xem chính sách bảo mật</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  placeholder: { width: 40, alignItems: 'flex-end' },
  content: { flex: 1 },
  section: { paddingTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingItemDisabled: { opacity: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: '#1F2937', marginBottom: 2 },
  settingTitleDisabled: { color: '#9CA3AF' },
  settingDescription: { fontSize: 13, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  versionContainer: { alignItems: 'center', paddingVertical: 32 },
  versionText: { fontSize: 13, color: '#9CA3AF' },
});

export default SettingsScreen;
