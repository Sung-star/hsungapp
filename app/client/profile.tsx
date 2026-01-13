// app/client/profile.tsx - COMPLETE Profile Screen with All Modals

import { auth, db } from '@/config/firebase';
import { logout } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { updateProfile } from 'firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface UserSettings {
  notifications: boolean;
  emailNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export default function ClientProfileScreen() {
  const user = auth.currentUser;
  const router = useRouter();
  const { unreadCount } = useNotifications();
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
  });

  // Favorites state
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    loadStats();
    loadAddresses();
    loadSettings();
    loadFavorites();
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setEditPhone(userData.phone || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid)
      );
      const snapshot = await getDocs(q);

      const orders = snapshot.docs.map((doc) => doc.data());
      const completed = orders.filter((o) => o.status === 'completed');
      const totalSpent = completed.reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalSpent,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'addresses'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const addressList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Address[];
      setAddresses(addressList);
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'userSettings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as UserSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      setFavoriteCount(snapshot.size);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user, { displayName: editName });
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: editName, phone: editPhone },
        { merge: true }
      );
      setShowProfileModal(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    if (!user) return;
    if (!newAddress.name || !newAddress.phone || !newAddress.address) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const addressRef = doc(collection(db, 'addresses'));
      await setDoc(addressRef, {
        userId: user.uid,
        ...newAddress,
        isDefault: addresses.length === 0,
        createdAt: new Date(),
      });
      setNewAddress({ name: '', phone: '', address: '' });
      setShowAddressModal(false);
      loadAddresses();
      Alert.alert('Thành công', 'Đã thêm địa chỉ mới');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể thêm địa chỉ');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'addresses', addressId), {
              deleted: true,
            });
            loadAddresses();
            Alert.alert('Thành công', 'Đã xóa địa chỉ');
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể xóa địa chỉ');
          }
        },
      },
    ]);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'userSettings', user.uid), settings);
      setShowSettingsModal(false);
      Alert.alert('Thành công', 'Đã lưu cài đặt');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    }
  };

  const handleLogout = () => {
    showConfirmDialog(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      async () => {
        try {
          await logout();
          router.replace('/auth/login');
        } catch (error) {
          showAlert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="white" />
              </View>
            )}
          </View>

          <Text style={styles.name}>{user?.displayName || 'Khách hàng'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#667eea' }]}>
            <Ionicons name="receipt-outline" size={28} color="white" />
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#43A047' }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color="white" />
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFA726' }]}>
            <Ionicons name="cash-outline" size={28} color="white" />
            <Text style={styles.statValue}>
              {stats.totalSpent > 1000000
                ? `${(stats.totalSpent / 1000000).toFixed(1)}M`
                : `${(stats.totalSpent / 1000).toFixed(0)}K`}
            </Text>
            <Text style={styles.statLabel}>Đã chi</Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Tài khoản</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="person-outline" size={22} color="#667eea" />
              </View>
              <Text style={styles.menuText}>Thông tin cá nhân</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* NEW: Change Password */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/client/change-password')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="key-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/client/my-orders')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="receipt-outline" size={22} color="#FFA726" />
              </View>
              <Text style={styles.menuText}>Đơn hàng của tôi</Text>
            </View>
            <View style={styles.menuItemRight}>
              {stats.totalOrders > 0 && (
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{stats.totalOrders}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowAddressModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="location-outline" size={22} color="#43A047" />
              </View>
              <Text style={styles.menuText}>Địa chỉ giao hàng</Text>
            </View>
            <View style={styles.menuItemRight}>
              {addresses.length > 0 && (
                <View style={[styles.orderBadge, { backgroundColor: '#43A047' }]}>
                  <Text style={styles.orderBadgeText}>{addresses.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/client/favorites')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="heart-outline" size={22} color="#E91E63" />
              </View>
              <Text style={styles.menuText}>Sản phẩm yêu thích</Text>
            </View>
            <View style={styles.menuItemRight}>
              {favoriteCount > 0 && (
                <View style={[styles.orderBadge, { backgroundColor: '#E91E63' }]}>
                  <Text style={styles.orderBadgeText}>{favoriteCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Cài đặt</Text>

          {/* NEW: Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/client/notifications')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="notifications-outline" size={22} color="#FFA726" />
              </View>
              <Text style={styles.menuText}>Thông báo</Text>
            </View>
            <View style={styles.menuItemRight}>
              {unreadCount > 0 && (
                <View style={[styles.orderBadge, { backgroundColor: '#FF6B6B' }]}>
                  <Text style={styles.orderBadgeText}>{unreadCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowSettingsModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="settings-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.menuText}>Cài đặt thông báo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowHelpModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Trợ giúp</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={22} color="white" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Profile Edit Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nhập họ và tên"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Địa chỉ giao hàng</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Existing Addresses */}
              {addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressName}>{addr.name}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressPhone}>{addr.phone}</Text>
                  <Text style={styles.addressText}>{addr.address}</Text>
                  <TouchableOpacity
                    style={styles.deleteAddressBtn}
                    onPress={() => handleDeleteAddress(addr.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    <Text style={styles.deleteAddressText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add New Address */}
              <View style={styles.newAddressSection}>
                <Text style={styles.sectionTitle}>Thêm địa chỉ mới</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tên người nhận</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddress.name}
                    onChangeText={(text) =>
                      setNewAddress({ ...newAddress, name: text })
                    }
                    placeholder="Nhập tên người nhận"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddress.phone}
                    onChangeText={(text) =>
                      setNewAddress({ ...newAddress, phone: text })
                    }
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Địa chỉ chi tiết</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newAddress.address}
                    onChangeText={(text) =>
                      setNewAddress({ ...newAddress, address: text })
                    }
                    placeholder="Nhập địa chỉ chi tiết"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddAddress}
                >
                  <Text style={styles.saveButtonText}>Thêm địa chỉ</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cài đặt thông báo</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingText}>Thông báo đẩy</Text>
                <Text style={styles.settingDesc}>Nhận thông báo trên thiết bị</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={(val) =>
                  setSettings({ ...settings, notifications: val })
                }
                trackColor={{ false: '#ddd', true: '#667eea' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingText}>Email thông báo</Text>
                <Text style={styles.settingDesc}>Nhận thông báo qua email</Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={(val) =>
                  setSettings({ ...settings, emailNotifications: val })
                }
                trackColor={{ false: '#ddd', true: '#667eea' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingText}>Cập nhật đơn hàng</Text>
                <Text style={styles.settingDesc}>Thông báo về trạng thái đơn hàng</Text>
              </View>
              <Switch
                value={settings.orderUpdates}
                onValueChange={(val) =>
                  setSettings({ ...settings, orderUpdates: val })
                }
                trackColor={{ false: '#ddd', true: '#667eea' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingText}>Khuyến mãi</Text>
                <Text style={styles.settingDesc}>Nhận thông báo về ưu đãi</Text>
              </View>
              <Switch
                value={settings.promotions}
                onValueChange={(val) =>
                  setSettings({ ...settings, promotions: val })
                }
                trackColor={{ false: '#ddd', true: '#667eea' }}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSettings}
            >
              <Text style={styles.saveButtonText}>Lưu cài đặt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trợ giúp & Hỗ trợ</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.helpSection}>
                <View style={styles.helpIcon}>
                  <Ionicons name="call-outline" size={24} color="#667eea" />
                </View>
                <Text style={styles.helpTitle}>Hotline</Text>
                <Text style={styles.helpText}>1900 1234</Text>
              </View>

              <View style={styles.helpSection}>
                <View style={styles.helpIcon}>
                  <Ionicons name="mail-outline" size={24} color="#667eea" />
                </View>
                <Text style={styles.helpTitle}>Email</Text>
                <Text style={styles.helpText}>support@example.com</Text>
              </View>

              <View style={styles.helpSection}>
                <View style={styles.helpIcon}>
                  <Ionicons name="time-outline" size={24} color="#667eea" />
                </View>
                <Text style={styles.helpTitle}>Giờ làm việc</Text>
                <Text style={styles.helpText}>8:00 - 22:00 (Hàng ngày)</Text>
              </View>

              <View style={styles.helpSection}>
                <View style={styles.helpIcon}>
                  <Ionicons name="chatbubble-outline" size={24} color="#667eea" />
                </View>
                <Text style={styles.helpTitle}>FAQ</Text>
                <Text style={styles.helpText}>
                  Câu hỏi thường gặp về đơn hàng, thanh toán, và giao hàng
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },

  /* ===== HEADER ===== */
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: 'center', paddingHorizontal: 20 },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  name: { fontSize: 22, fontWeight: '700', color: 'white' },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },

  content: { flex: 1, marginTop: -20 },

  /* ===== STATS ===== */
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },

  /* ===== MENU ===== */
  menuSection: { paddingHorizontal: 20, marginBottom: 16 },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  orderBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  orderBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* ===== LOGOUT ===== */
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  logoutGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: 'white', fontSize: 16, fontWeight: '700' },

  /* ===== MODAL ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  /* ===== FORM ===== */
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fafafa',
  },
  inputDisabled: { backgroundColor: '#eee' },
  textArea: { height: 80, textAlignVertical: 'top' },

  saveButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ===== HELP ===== */
  helpSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    marginBottom: 16,
  },
  helpIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  helpTitle: { fontSize: 16, fontWeight: '700' },
  helpText: { fontSize: 14, color: '#666', textAlign: 'center' },
  /* ===== ADDRESS ===== */
addressCard: {
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 14,
  marginBottom: 12,
  elevation: 2,
},
addressHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
addressName: {
  fontSize: 15,
  fontWeight: '700',
  color: '#1a1a1a',
},
defaultBadge: {
  backgroundColor: '#43A047',
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
defaultBadgeText: {
  color: 'white',
  fontSize: 11,
  fontWeight: '700',
},
addressPhone: {
  marginTop: 6,
  fontSize: 13,
  color: '#555',
},
addressText: {
  marginTop: 4,
  fontSize: 14,
  color: '#333',
},
deleteAddressBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 10,
},
deleteAddressText: {
  color: '#FF6B6B',
  fontSize: 14,
  fontWeight: '600',
},

/* ===== ADD NEW ADDRESS ===== */
newAddressSection: {
  marginTop: 20,
  paddingTop: 20,
  borderTopWidth: 1,
  borderTopColor: '#eee',
},
sectionTitle: {
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 12,
},

/* ===== SETTINGS ===== */
settingItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
settingText: {
  fontSize: 15,
  fontWeight: '600',
},
settingDesc: {
  fontSize: 13,
  color: '#777',
  marginTop: 2,
},

});
