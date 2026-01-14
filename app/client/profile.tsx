// app/client/profile.tsx - 🎨 REDESIGNED Fresh Market Theme
import { auth, db } from '@/config/firebase';
import { logout } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { updateProfile } from 'firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';

interface Address { id: string; name: string; phone: string; address: string; isDefault: boolean; }
interface UserSettings { notifications: boolean; emailNotifications: boolean; orderUpdates: boolean; promotions: boolean; }

export default function ClientProfileScreen() {
  const user = auth.currentUser;
  const router = useRouter();
  const { unreadCount } = useNotifications();
  
  const [stats, setStats] = useState({ totalOrders: 0, completedOrders: 0, totalSpent: 0 });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address: '' });
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    loadStats();
    loadAddresses();
    loadFavorites();
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) setEditPhone(userDoc.data().phone || '');
    } catch (err) { console.error('Error loading profile:', err); }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => doc.data());
      const completed = orders.filter((o) => o.status === 'completed');
      const totalSpent = completed.reduce((sum, o) => sum + (o.total || 0), 0);
      setStats({ totalOrders: orders.length, completedOrders: completed.length, totalSpent });
    } catch (err) { console.error('Error loading stats:', err); }
  };

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.filter(d => !d.data().deleted).map((d) => ({ id: d.id, ...d.data() })) as Address[];
      setAddresses(list);
    } catch (err) { console.error('Error loading addresses:', err); }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setFavoriteCount(snapshot.size);
    } catch (err) { console.error('Error loading favorites:', err); }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    return `${(amount / 1000).toFixed(0)}K`;
  };

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên'); return; }
    setSaving(true);
    try {
      await updateProfile(user, { displayName: editName });
      await setDoc(doc(db, 'users', user.uid), { displayName: editName, phone: editPhone }, { merge: true });
      setShowProfileModal(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (err) { Alert.alert('Lỗi', 'Không thể cập nhật'); }
    finally { setSaving(false); }
  };

  const handleAddAddress = async () => {
    if (!user || !newAddress.name || !newAddress.phone || !newAddress.address) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ'); return;
    }
    try {
      const addressRef = doc(collection(db, 'addresses'));
      await setDoc(addressRef, { userId: user.uid, ...newAddress, isDefault: addresses.length === 0, createdAt: new Date() });
      setNewAddress({ name: '', phone: '', address: '' });
      setShowAddressModal(false);
      loadAddresses();
      Alert.alert('Thành công', 'Đã thêm địa chỉ');
    } catch (err) { Alert.alert('Lỗi', 'Không thể thêm địa chỉ'); }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Xác nhận', 'Xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await updateDoc(doc(db, 'addresses', addressId), { deleted: true });
          loadAddresses();
        } catch (err) { Alert.alert('Lỗi', 'Không thể xóa'); }
      }},
    ]);
  };

  const handleLogout = () => {
    showConfirmDialog('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', async () => {
      try { await logout(); router.replace('/auth/login'); }
      catch (error) { showAlert('Lỗi', 'Không thể đăng xuất'); }
    });
  };

  const menuItems = [
    { id: 1, title: 'Thông tin cá nhân', icon: 'person-outline', color: '#3B82F6', bg: '#DBEAFE', onPress: () => setShowProfileModal(true) },
    { id: 2, title: 'Đổi mật khẩu', icon: 'key-outline', color: '#8B5CF6', bg: '#EDE9FE', onPress: () => router.push('/client/change-password') },
    { id: 3, title: 'Đơn hàng của tôi', icon: 'receipt-outline', color: '#F59E0B', bg: '#FEF3C7', badge: stats.totalOrders, onPress: () => router.push('/client/my-orders') },
    { id: 4, title: 'Địa chỉ giao hàng', icon: 'location-outline', color: '#22C55E', bg: '#DCFCE7', badge: addresses.length, onPress: () => setShowAddressModal(true) },
    { id: 5, title: 'Sản phẩm yêu thích', icon: 'heart-outline', color: '#EC4899', bg: '#FCE7F3', badge: favoriteCount, onPress: () => router.push('/client/favorites') },
  ];

  const settingsItems = [
    { id: 1, title: 'Thông báo', icon: 'notifications-outline', color: '#F59E0B', bg: '#FEF3C7', badge: unreadCount, onPress: () => router.push('/client/notifications') },
    { id: 2, title: 'Cài đặt', icon: 'settings-outline', color: '#8B5CF6', bg: '#EDE9FE', onPress: () => router.push('/client/settings') },
    { id: 3, title: 'Bảo mật', icon: 'shield-checkmark-outline', color: '#EF4444', bg: '#FEE2E2', onPress: () => router.push('/client/security') },
    { id: 4, title: 'Trợ giúp', icon: 'help-circle-outline', color: '#3B82F6', bg: '#DBEAFE', onPress: () => setShowHelpModal(true) },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#fff', '#E5E7EB']} style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#22C55E" />
              </LinearGradient>
            )}
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'Khách hàng'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Đã chi</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Tài khoản</Text>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: item.color }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Cài đặt</Text>
          {settingsItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.logoutGradient}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>Phiên bản 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Nhập họ tên" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Nhập SĐT" keyboardType="phone-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={[styles.input, styles.inputDisabled]} value={user?.email || ''} editable={false} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={saving}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
              </LinearGradient>
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
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressCardHeader}>
                    <Text style={styles.addressCardName}>{addr.name}</Text>
                    {addr.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Mặc định</Text></View>}
                  </View>
                  <Text style={styles.addressCardPhone}>{addr.phone}</Text>
                  <Text style={styles.addressCardText}>{addr.address}</Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAddress(addr.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.addAddressSection}>
                <Text style={styles.addAddressTitle}>Thêm địa chỉ mới</Text>
                <View style={styles.inputGroup}>
                  <TextInput style={styles.input} value={newAddress.name} onChangeText={(t) => setNewAddress({...newAddress, name: t})} placeholder="Tên người nhận" />
                </View>
                <View style={styles.inputGroup}>
                  <TextInput style={styles.input} value={newAddress.phone} onChangeText={(t) => setNewAddress({...newAddress, phone: t})} placeholder="Số điện thoại" keyboardType="phone-pad" />
                </View>
                <View style={styles.inputGroup}>
                  <TextInput style={[styles.input, { height: 80 }]} value={newAddress.address} onChangeText={(t) => setNewAddress({...newAddress, address: t})} placeholder="Địa chỉ chi tiết" multiline />
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddAddress}>
                  <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>Thêm địa chỉ</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.helpCard}>
              <View style={[styles.helpIcon, { backgroundColor: '#DCFCE7' }]}><Ionicons name="call" size={24} color="#22C55E" /></View>
              <Text style={styles.helpTitle}>Hotline</Text>
              <Text style={styles.helpText}>1900 1234</Text>
            </View>
            <View style={styles.helpCard}>
              <View style={[styles.helpIcon, { backgroundColor: '#DBEAFE' }]}><Ionicons name="mail" size={24} color="#3B82F6" /></View>
              <Text style={styles.helpTitle}>Email</Text>
              <Text style={styles.helpText}>support@minimart.vn</Text>
            </View>
            <View style={styles.helpCard}>
              <View style={[styles.helpIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="time" size={24} color="#F59E0B" /></View>
              <Text style={styles.helpTitle}>Giờ làm việc</Text>
              <Text style={styles.helpText}>8:00 - 22:00 (Hàng ngày)</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20, borderRadius: 16, paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  menuSection: { marginBottom: 24 },
  menuTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  logoutBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  logoutGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  inputDisabled: { backgroundColor: '#E5E7EB', color: '#6B7280' },
  saveBtn: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  addressCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, marginBottom: 12 },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressCardName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  defaultBadge: { backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  addressCardPhone: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  addressCardText: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  addAddressSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  addAddressTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  helpCard: { alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, marginBottom: 12 },
  helpIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  helpTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  helpText: { fontSize: 14, color: '#6B7280', marginTop: 2 },
});