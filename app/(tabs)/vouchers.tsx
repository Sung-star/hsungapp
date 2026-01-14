// app/(tabs)/vouchers.tsx - Admin Vouchers with Gift Feature Integrated

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Voucher,
  VoucherType,
  VoucherStatus,
} from '@/types/voucher';
import {
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getVoucherStats,
  giftVoucherToUser,
  giftVoucherToMultipleUsers,
} from '@/services/voucherService';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

type TabType = 'list' | 'create' | 'gift';

interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
}

export default function AdminVouchersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalVouchers: 0, activeVouchers: 0, totalUsage: 0, totalDiscount: 0 });

  // Create form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as VoucherType,
    value: '',
    minOrderValue: '',
    maxDiscount: '',
    totalUsageLimit: '',
    perUserLimit: '1',
    startDate: '',
    endDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Gift state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gifting, setGifting] = useState(false);

  // Edit modal
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'gift') {
      loadUsers();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [voucherList, voucherStats] = await Promise.all([
        getAllVouchers(),
        getVoucherStats(),
      ]);
      setVouchers(voucherList);
      setStats(voucherStats);
    } catch (error) {
      console.error('Error loading vouchers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const userList: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role !== 'admin') {
          userList.push({
            id: doc.id,
            displayName: data.displayName || 'Chưa đặt tên',
            email: data.email || '',
            phone: data.phone || '',
          });
        }
      });
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  // ==================== CREATE VOUCHER ====================
  const handleCreate = async () => {
    if (!formData.code.trim()) { showAlert('Lỗi', 'Vui lòng nhập mã voucher'); return; }
    if (!formData.name.trim()) { showAlert('Lỗi', 'Vui lòng nhập tên voucher'); return; }
    if (!formData.value) { showAlert('Lỗi', 'Vui lòng nhập giá trị'); return; }
    if (!formData.startDate || !formData.endDate) { showAlert('Lỗi', 'Vui lòng nhập ngày bắt đầu và kết thúc'); return; }

    const startDate = parseDate(formData.startDate);
    const endDate = parseDate(formData.endDate);
    if (!startDate || !endDate) { showAlert('Lỗi', 'Định dạng ngày không hợp lệ (DD/MM/YYYY)'); return; }
    if (endDate <= startDate) { showAlert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu'); return; }

    setCreating(true);
    try {
      const result = await createVoucher({
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        type: formData.type,
        value: parseFloat(formData.value),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        totalUsageLimit: formData.totalUsageLimit ? parseInt(formData.totalUsageLimit) : undefined,
        perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit) : 1,
        startDate,
        endDate,
        status: 'active',
        source: 'promotion',
      });

      if (result.success) {
        showAlert('Thành công', 'Đã tạo voucher');
        setFormData({ code: '', name: '', description: '', type: 'percentage', value: '', minOrderValue: '', maxDiscount: '', totalUsageLimit: '', perUserLimit: '1', startDate: '', endDate: '' });
        setActiveTab('list');
        loadData();
      } else {
        showAlert('Lỗi', result.message);
      }
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể tạo voucher');
    } finally {
      setCreating(false);
    }
  };

  // ==================== DELETE VOUCHER ====================
  const handleDelete = (voucher: Voucher) => {
    showConfirmDialog(
      'Xóa voucher',
      `Bạn có chắc muốn xóa voucher "${voucher.code}"?`,
      async () => {
        const result = await deleteVoucher(voucher.id);
        if (result.success) {
          showAlert('Thành công', 'Đã xóa voucher');
          loadData();
        } else {
          showAlert('Lỗi', result.message);
        }
      }
    );
  };

  // ==================== TOGGLE STATUS ====================
  const handleToggleStatus = async (voucher: Voucher) => {
    const newStatus: VoucherStatus = voucher.status === 'active' ? 'inactive' : 'active';
    const result = await updateVoucher(voucher.id, { status: newStatus });
    if (result.success) {
      loadData();
    }
  };

  // ==================== GIFT VOUCHER ====================
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleGiftVoucher = async () => {
    if (!selectedVoucher) { showAlert('Lỗi', 'Vui lòng chọn voucher'); return; }
    if (selectedUsers.length === 0) { showAlert('Lỗi', 'Vui lòng chọn người nhận'); return; }

    setGifting(true);
    try {
      const result = await giftVoucherToMultipleUsers(
        selectedUsers,
        selectedVoucher.id,
        'admin_gift',
        'Tặng bởi Admin'
      );
      showAlert('Thành công', `Đã tặng ${result.success} voucher thành công${result.failed > 0 ? `, ${result.failed} thất bại` : ''}`);
      setSelectedVoucher(null);
      setSelectedUsers([]);
      setActiveTab('list');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể tặng voucher');
    } finally {
      setGifting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==================== RENDER ====================
  const renderVoucherCard = (voucher: Voucher) => {
    const isActive = voucher.status === 'active';
    const isExpired = new Date(voucher.endDate) < new Date();

    return (
      <View key={voucher.id} style={styles.voucherCard}>
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{voucher.code}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isActive && !isExpired ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: isActive && !isExpired ? '#22C55E' : '#EF4444' }]}>
                {isExpired ? 'Hết hạn' : isActive ? 'Hoạt động' : 'Tắt'}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(voucher)}>
              <Ionicons name={isActive ? "pause" : "play"} size={18} color={isActive ? "#F59E0B" : "#22C55E"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedVoucher(voucher); setActiveTab('gift'); }}>
              <Ionicons name="gift" size={18} color="#8B5CF6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(voucher)}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.voucherName}>{voucher.name}</Text>
        
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>
            {voucher.type === 'percentage' ? `Giảm ${voucher.value}%` : voucher.type === 'free_shipping' ? 'Miễn phí vận chuyển' : `Giảm ${formatPrice(voucher.value)}`}
          </Text>
          {voucher.maxDiscount && <Text style={styles.maxDiscountText}>(Tối đa {formatPrice(voucher.maxDiscount)})</Text>}
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cart-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>Tối thiểu: {formatPrice(voucher.minOrderValue)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>Đã dùng: {voucher.usageCount}{voucher.totalUsageLimit ? `/${voucher.totalUsageLimit}` : ''}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
          <Text style={styles.dateText}>{formatDate(voucher.startDate)} - {formatDate(voucher.endDate)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Voucher</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalVouchers}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeVouchers}</Text>
            <Text style={styles.statLabel}>Hoạt động</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalUsage}</Text>
            <Text style={styles.statLabel}>Đã dùng</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'list' && styles.tabActive]} onPress={() => setActiveTab('list')}>
          <Ionicons name="list" size={18} color={activeTab === 'list' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Danh sách</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'create' && styles.tabActive]} onPress={() => setActiveTab('create')}>
          <Ionicons name="add-circle" size={18} color={activeTab === 'create' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>Tạo mới</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'gift' && styles.tabActive]} onPress={() => setActiveTab('gift')}>
          <Ionicons name="gift" size={18} color={activeTab === 'gift' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'gift' && styles.tabTextActive]}>Tặng</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'list' && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        >
          {vouchers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có voucher nào</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setActiveTab('create')}>
                <Text style={styles.createBtnText}>Tạo voucher đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vouchers.map(renderVoucherCard)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'create' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Thông tin voucher</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mã voucher *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: SALE50"
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên voucher *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Giảm 50% cho đơn đầu tiên"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Loại giảm giá *</Text>
              <View style={styles.typeSelector}>
                {[
                  { value: 'percentage', label: 'Phần trăm %', icon: 'pricetag' },
                  { value: 'fixed_amount', label: 'Số tiền', icon: 'cash' },
                  { value: 'free_shipping', label: 'Freeship', icon: 'car' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeOption, formData.type === type.value && styles.typeOptionActive]}
                    onPress={() => setFormData({ ...formData, type: type.value as VoucherType })}
                  >
                    <Ionicons name={type.icon as any} size={18} color={formData.type === type.value ? '#fff' : '#6B7280'} />
                    <Text style={[styles.typeText, formData.type === type.value && styles.typeTextActive]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{formData.type === 'percentage' ? 'Phần trăm giảm *' : 'Số tiền giảm *'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={formData.type === 'percentage' ? 'VD: 50' : 'VD: 50000'}
                  value={formData.value}
                  onChangeText={(text) => setFormData({ ...formData, value: text })}
                  keyboardType="numeric"
                />
              </View>
              {formData.type === 'percentage' && (
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Giảm tối đa</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 100000"
                    value={formData.maxDiscount}
                    onChangeText={(text) => setFormData({ ...formData, maxDiscount: text })}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Đơn tối thiểu</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 200000"
                value={formData.minOrderValue}
                onChangeText={(text) => setFormData({ ...formData, minOrderValue: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày bắt đầu *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  value={formData.startDate}
                  onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Ngày kết thúc *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  value={formData.endDate}
                  onChangeText={(text) => setFormData({ ...formData, endDate: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tổng lượt dùng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Không giới hạn"
                  value={formData.totalUsageLimit}
                  onChangeText={(text) => setFormData({ ...formData, totalUsageLimit: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Lượt/người</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={formData.perUserLimit}
                  onChangeText={(text) => setFormData({ ...formData, perUserLimit: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, creating && styles.submitBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.submitGradient}>
                {creating ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitText}>Tạo voucher</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'gift' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Select Voucher */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>1. Chọn voucher để tặng</Text>
            {vouchers.filter(v => v.status === 'active').length === 0 ? (
              <Text style={styles.noVoucherText}>Không có voucher đang hoạt động</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voucherScroll}>
                {vouchers.filter(v => v.status === 'active').map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.voucherOption, selectedVoucher?.id === v.id && styles.voucherOptionActive]}
                    onPress={() => setSelectedVoucher(v)}
                  >
                    <Text style={styles.voucherOptionCode}>{v.code}</Text>
                    <Text style={styles.voucherOptionName} numberOfLines={1}>{v.name}</Text>
                    {selectedVoucher?.id === v.id && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Select Users */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>2. Chọn người nhận ({selectedUsers.length} đã chọn)</Text>
            
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên hoặc email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {selectedUsers.length > 0 && (
              <TouchableOpacity style={styles.clearSelection} onPress={() => setSelectedUsers([])}>
                <Text style={styles.clearSelectionText}>Bỏ chọn tất cả</Text>
              </TouchableOpacity>
            )}

            {loadingUsers ? (
              <ActivityIndicator size="small" color="#22C55E" style={{ marginVertical: 20 }} />
            ) : (
              filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.userItem, selectedUsers.includes(user.id) && styles.userItemActive]}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.displayName}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[styles.checkbox, selectedUsers.includes(user.id) && styles.checkboxActive]}>
                    {selectedUsers.includes(user.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Gift Button */}
          <TouchableOpacity
            style={[styles.giftBtn, (!selectedVoucher || selectedUsers.length === 0 || gifting) && styles.giftBtnDisabled]}
            onPress={handleGiftVoucher}
            disabled={!selectedVoucher || selectedUsers.length === 0 || gifting}
          >
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.giftGradient}>
              {gifting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="gift" size={22} color="#fff" />
                  <Text style={styles.giftBtnText}>
                    Tặng voucher cho {selectedUsers.length} người
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 16, marginTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#22C55E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  content: { flex: 1, paddingHorizontal: 16 },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  createBtn: { marginTop: 20, backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  createBtnText: { color: '#fff', fontWeight: '700' },

  voucherCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#1F2937', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  voucherName: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  valueText: { fontSize: 18, fontWeight: '700', color: '#22C55E' },
  maxDiscountText: { fontSize: 13, color: '#6B7280' },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#6B7280' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: '#9CA3AF' },

  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row' },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F3F4F6' },
  typeOptionActive: { backgroundColor: '#22C55E' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#fff' },
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Gift styles
  noVoucherText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 20 },
  voucherScroll: { marginBottom: 8 },
  voucherOption: { width: 140, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  voucherOptionActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  voucherOptionCode: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  voucherOptionName: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1F2937', marginLeft: 10 },
  clearSelection: { alignSelf: 'flex-end', marginBottom: 12 },
  clearSelectionText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  userItemActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  userEmail: { fontSize: 13, color: '#6B7280' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  giftBtn: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  giftBtnDisabled: { opacity: 0.5 },
  giftGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  giftBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});