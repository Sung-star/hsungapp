// app/(tabs)/profile.tsx - Admin Profile Fresh Market Theme

import { auth, db } from '@/config/firebase';
import { getAllOrders } from '@/firebase/orderService';
import { getAllProducts } from '@/firebase/productService';
import { logout, updateUserProfile } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';

interface AdminSettings {
  notifications: boolean;
  emailNotifications: boolean;
  orderAlerts: boolean;
  lowStockAlerts: boolean;
}

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [displayName, setDisplayName] = useState(user?.displayName || 'Admin');
  const [phone, setPhone] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [editName, setEditName] = useState(displayName);
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<AdminSettings>({
    notifications: true,
    emailNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    loadStats();
    loadUserProfile();
    loadSettings();
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPhone(userData.phone || '');
        setEditPhone(userData.phone || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'adminSettings', user.uid));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AdminSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadStats = async () => {
    try {
      const [orders, products] = await Promise.all([getAllOrders(), getAllProducts()]);
      const completedOrders = orders.filter((o) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

      setStats({
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        totalProducts: products.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoURL(result.assets[0].uri);
        showAlert('Thành công', 'Ảnh đại diện đã được cập nhật');
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({ displayName: editName });
      await setDoc(doc(db, 'users', user!.uid), { displayName: editName, phone: editPhone }, { merge: true });
      setDisplayName(editName);
      setPhone(editPhone);
      setShowEditModal(false);
      showAlert('Thành công', 'Đã cập nhật thông tin');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'adminSettings', user.uid), settings);
      setShowSettingsModal(false);
      showAlert('Thành công', 'Đã lưu cài đặt');
    } catch (err) {
      showAlert('Lỗi', 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showConfirmDialog('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', async () => {
      try {
        await logout();
        router.replace('/auth/login');
      } catch (error) {
        showAlert('Lỗi', 'Không thể đăng xuất');
      }
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    return `${(amount / 1000).toFixed(0)}K`;
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', color: '#3B82F6', bg: '#DBEAFE', onPress: () => { setEditName(displayName); setEditPhone(phone); setShowEditModal(true); } },
    { icon: 'notifications-outline', label: 'Cài đặt thông báo', color: '#8B5CF6', bg: '#EDE9FE', onPress: () => setShowSettingsModal(true) },
    { icon: 'shield-checkmark-outline', label: 'Bảo mật', color: '#EF4444', bg: '#FEE2E2', onPress: () => showAlert('Thông báo', 'Tính năng đang phát triển') },
    { icon: 'receipt-outline', label: 'Quản lý đơn hàng', color: '#F59E0B', bg: '#FEF3C7', badge: stats.totalOrders, onPress: () => router.push('/(tabs)/orders') },
    { icon: 'cube-outline', label: 'Quản lý sản phẩm', color: '#22C55E', bg: '#DCFCE7', badge: stats.totalProducts, onPress: () => router.push('/(tabs)/products') },
    { icon: 'ticket-outline', label: 'Quản lý voucher', color: '#EC4899', bg: '#FCE7F3', onPress: () => router.push('/(tabs)/vouchers') },
    { icon: 'star-outline', label: 'Quản lý đánh giá', color: '#F97316', bg: '#FFEDD5', onPress: () => router.push('/reviews' as any) },
    { icon: 'stats-chart-outline', label: 'Thống kê', color: '#06B6D4', bg: '#CFFAFE', onPress: () => router.push('/statistics' as any) },
    { icon: 'help-circle-outline', label: 'Trợ giúp', color: '#6B7280', bg: '#F3F4F6', onPress: () => showAlert('Hỗ trợ', 'Hotline: 1900 1234\nEmail: support@freshmarket.vn') },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color="white" />
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
          <Text style={styles.roleText}>Quản trị viên</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#22C55E' }]}>
            <Ionicons name="receipt" size={24} color="white" />
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="checkmark-done-circle" size={24} color="white" />
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="cash" size={24} color="white" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.statLabel}>Doanh thu</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={[styles.menuBadge, { backgroundColor: item.color }]}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.logoutGradient}>
            <Ionicons name="log-out-outline" size={22} color="white" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>Fresh Market Admin v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Nhập họ tên" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Nhập số điện thoại" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={[styles.input, styles.inputDisabled]} value={user?.email || ''} editable={false} />
              <Text style={styles.helperText}>Email không thể thay đổi</Text>
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleUpdateProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cài đặt thông báo</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Thông báo đẩy</Text>
                <Text style={styles.settingDesc}>Nhận thông báo trên thiết bị</Text>
              </View>
              <Switch value={settings.notifications} onValueChange={(val) => setSettings({ ...settings, notifications: val })} trackColor={{ false: '#E5E7EB', true: '#22C55E' }} thumbColor="white" />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Email thông báo</Text>
                <Text style={styles.settingDesc}>Nhận thông báo qua email</Text>
              </View>
              <Switch value={settings.emailNotifications} onValueChange={(val) => setSettings({ ...settings, emailNotifications: val })} trackColor={{ false: '#E5E7EB', true: '#22C55E' }} thumbColor="white" />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Đơn hàng mới</Text>
                <Text style={styles.settingDesc}>Thông báo khi có đơn hàng mới</Text>
              </View>
              <Switch value={settings.orderAlerts} onValueChange={(val) => setSettings({ ...settings, orderAlerts: val })} trackColor={{ false: '#E5E7EB', true: '#22C55E' }} thumbColor="white" />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Cảnh báo tồn kho</Text>
                <Text style={styles.settingDesc}>Thông báo khi sản phẩm sắp hết</Text>
              </View>
              <Switch value={settings.lowStockAlerts} onValueChange={(val) => setSettings({ ...settings, lowStockAlerts: val })} trackColor={{ false: '#E5E7EB', true: '#22C55E' }} thumbColor="white" />
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveSettings} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Lưu cài đặt</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: 'white' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'white' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  name: { fontSize: 24, fontWeight: '700', color: 'white' },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#FFD700' },

  content: { flex: 1, marginTop: -20 },

  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: 'white', marginTop: 8 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  menuSection: { paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 14, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  menuBadgeText: { fontSize: 12, fontWeight: '700', color: 'white' },

  logoutBtn: { marginHorizontal: 20, marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  logoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  logoutText: { fontSize: 16, fontWeight: '700', color: 'white' },

  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  saveBtn: { backgroundColor: '#22C55E', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },

  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingInfo: { flex: 1 },
  settingText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  settingDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});