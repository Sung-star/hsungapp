// app/client/vouchers.tsx - Client Vouchers Screen (Shows both personal & public vouchers)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '@/config/firebase';
import { Voucher, UserVoucher } from '@/types/voucher';
import { getUserVouchers, getPublicVouchers } from '@/services/voucherService';

type TabType = 'my' | 'public';

export default function ClientVouchersScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [myVouchers, setMyVouchers] = useState<UserVoucher[]>([]);
  const [publicVouchers, setPublicVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my');

  useEffect(() => {
    loadVouchers();
  }, [user]);

  const loadVouchers = async () => {
    try {
      const publicList = await getPublicVouchers();
      setPublicVouchers(publicList);

      if (user) {
        const myList = await getUserVouchers(user.uid);
        setMyVouchers(myList);
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVouchers();
  }, []);

  const copyCode = (code: string) => {
    Alert.alert(
      '🎟️ Mã voucher',
      code,
      [
        { text: 'Đóng', style: 'cancel' },
        { 
          text: 'Dùng ngay', 
          onPress: () => router.push('/client/checkout')
        },
      ]
    );
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getDaysLeft = (date: Date) => {
    const now = new Date();
    const end = new Date(date);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return { icon: 'pricetag', color: '#8B5CF6', bg: '#EDE9FE' };
      case 'fixed_amount': return { icon: 'cash', color: '#22C55E', bg: '#DCFCE7' };
      case 'free_shipping': return { icon: 'car', color: '#3B82F6', bg: '#DBEAFE' };
      default: return { icon: 'ticket', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const getValueText = (type: string, value: number, maxDiscount?: number | null) => {
    if (type === 'percentage') {
      return `Giảm ${value}%${maxDiscount ? ` (tối đa ${formatPrice(maxDiscount)})` : ''}`;
    } else if (type === 'free_shipping') {
      return 'Miễn phí vận chuyển';
    } else {
      return `Giảm ${formatPrice(value)}`;
    }
  };

  const renderMyVoucherCard = (voucher: UserVoucher) => {
    const typeInfo = getTypeIcon(voucher.voucherType);
    const daysLeft = getDaysLeft(voucher.expiresAt);
    const isExpiringSoon = daysLeft <= 3 && daysLeft > 0;

    return (
      <TouchableOpacity 
        key={voucher.id} 
        style={styles.voucherCard}
        onPress={() => copyCode(voucher.voucherCode)}
        activeOpacity={0.7}
      >
        {isExpiringSoon && (
          <View style={styles.expiringBadge}>
            <Text style={styles.expiringText}>Sắp hết hạn</Text>
          </View>
        )}

        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: typeInfo.bg }]}>
            <Ionicons name={typeInfo.icon as any} size={28} color={typeInfo.color} />
          </View>
        </View>

        <View style={styles.cardCenter}>
          <Text style={styles.voucherName} numberOfLines={1}>{voucher.voucherName}</Text>
          <Text style={styles.valueText}>
            {getValueText(voucher.voucherType, voucher.voucherValue, voucher.maxDiscount)}
          </Text>
          {voucher.minOrderValue && voucher.minOrderValue > 0 && (
            <Text style={styles.conditionText}>Đơn tối thiểu {formatPrice(voucher.minOrderValue)}</Text>
          )}
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{voucher.voucherCode}</Text>
            <Ionicons name="copy-outline" size={16} color="#22C55E" />
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.expiryText, isExpiringSoon && { color: '#EF4444' }]}>
            {daysLeft > 0 ? `${daysLeft} ngày` : 'Hôm nay'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPublicVoucherCard = (voucher: Voucher) => {
    const typeInfo = getTypeIcon(voucher.type);
    const daysLeft = getDaysLeft(voucher.endDate);
    const usagePercent = voucher.totalUsageLimit 
      ? Math.round((voucher.usageCount / voucher.totalUsageLimit) * 100) 
      : 0;
    const isAlmostOut = usagePercent >= 80;

    return (
      <TouchableOpacity 
        key={voucher.id} 
        style={styles.voucherCard}
        onPress={() => copyCode(voucher.code)}
        activeOpacity={0.7}
      >
        {isAlmostOut && (
          <View style={[styles.expiringBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.expiringText, { color: '#D97706' }]}>Sắp hết</Text>
          </View>
        )}

        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: typeInfo.bg }]}>
            <Ionicons name={typeInfo.icon as any} size={28} color={typeInfo.color} />
          </View>
        </View>

        <View style={styles.cardCenter}>
          <Text style={styles.voucherName} numberOfLines={1}>{voucher.name}</Text>
          <Text style={styles.valueText}>
            {getValueText(voucher.type, voucher.value, voucher.maxDiscount)}
          </Text>
          {voucher.minOrderValue > 0 && (
            <Text style={styles.conditionText}>Đơn tối thiểu {formatPrice(voucher.minOrderValue)}</Text>
          )}
          
          {voucher.totalUsageLimit && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${usagePercent}%` }]} />
              </View>
              <Text style={styles.progressText}>Đã dùng {voucher.usageCount}/{voucher.totalUsageLimit}</Text>
            </View>
          )}

          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{voucher.code}</Text>
            <Ionicons name="copy-outline" size={16} color="#22C55E" />
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.expiryText}>HSD: {formatDate(voucher.endDate)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Voucher của tôi</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Vui lòng đăng nhập</Text>
          <Text style={styles.emptyText}>Đăng nhập để xem voucher của bạn</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voucher của tôi</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{myVouchers.length}</Text>
            <Text style={styles.summaryLabel}>Voucher của bạn</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{publicVouchers.length}</Text>
            <Text style={styles.summaryLabel}>Có thể dùng</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            Của tôi ({myVouchers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.tabActive]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>
            Tất cả ({publicVouchers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoBannerText}>
              {activeTab === 'my' 
                ? 'Đây là voucher được tặng riêng cho bạn'
                : 'Nhập mã voucher khi thanh toán để được giảm giá'}
            </Text>
          </View>

          {activeTab === 'my' ? (
            myVouchers.length === 0 ? (
              <View style={styles.emptyList}>
                <View style={styles.emptyListIcon}>
                  <Ionicons name="gift-outline" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyListTitle}>Chưa có voucher riêng</Text>
                <Text style={styles.emptyListText}>
                  Bạn có thể dùng voucher công khai ở tab Tất cả
                </Text>
                <TouchableOpacity 
                  style={styles.switchTabBtn}
                  onPress={() => setActiveTab('public')}
                >
                  <Text style={styles.switchTabBtnText}>Xem voucher công khai</Text>
                  <Ionicons name="arrow-forward" size={16} color="#22C55E" />
                </TouchableOpacity>
              </View>
            ) : (
              myVouchers.map(renderMyVoucherCard)
            )
          ) : (
            publicVouchers.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="ticket-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyListTitle}>Không có voucher</Text>
                <Text style={styles.emptyListText}>Hiện chưa có voucher khuyến mãi nào</Text>
              </View>
            ) : (
              publicVouchers.map(renderPublicVoucherCard)
            )
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Floating action button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/client/checkout')}
      >
        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.fabGradient}>
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.fabText}>Thanh toán</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  
  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 16, marginTop: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabActive: { backgroundColor: '#22C55E' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  content: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 16 },
  infoBannerText: { flex: 1, fontSize: 13, color: '#1E40AF' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  loginBtn: { marginTop: 20, backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  emptyList: { alignItems: 'center', paddingVertical: 40 },
  emptyListIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyListTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  emptyListText: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  switchTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#DCFCE7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  switchTabBtnText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },

  voucherCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, position: 'relative' },
  expiringBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 1 },
  expiringText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },

  cardLeft: { marginRight: 14 },
  iconContainer: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  cardCenter: { flex: 1 },
  voucherName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  valueText: { fontSize: 14, fontWeight: '600', color: '#22C55E', marginBottom: 4 },
  conditionText: { fontSize: 12, color: '#6B7280', marginBottom: 6 },

  progressContainer: { marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#22C55E', borderRadius: 2 },
  progressText: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  codeText: { fontSize: 13, fontWeight: '700', color: '#1F2937', letterSpacing: 1 },

  cardRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  expiryText: { fontSize: 11, color: '#6B7280' },

  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});