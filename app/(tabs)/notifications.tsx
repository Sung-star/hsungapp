// app/(tabs)/notifications.tsx - Fixed Admin Notification Management Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { showAlert, showConfirmDialog } from '@/utils/platformAlert';
import { createNotification, sendBulkNotifications } from '@/services/notificationService';
import { Notification, NotificationType } from '@/types/notification';

interface User {
  id: string;
  displayName: string;
  email: string;
  role?: string;
}

type TabType = 'send' | 'history';

const AdminNotificationsScreen = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('send');
  
  // Send notification state
  const [notificationType, setNotificationType] = useState<NotificationType>('promotion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  
  // User selection modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // History state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | NotificationType>('all');

  useEffect(() => {
    loadUsers();
    loadNotificationHistory();
  }, []);

  // FIXED: Load all users (không filter theo role vì có thể field không tồn tại)
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const userList: User[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Lọc bỏ admin users nếu có field role
        // Nếu không có field role, mặc định là client
        if (data.role !== 'admin') {
          userList.push({
            id: doc.id,
            displayName: data.displayName || data.name || 'Khách hàng',
            email: data.email || '',
            role: data.role || 'client',
          });
        }
      });
      
      console.log('✅ Loaded users:', userList.length);
      console.log('Users:', userList.map(u => ({ id: u.id, email: u.email })));
      
      setUsers(userList);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      showAlert('Lỗi', 'Không thể tải danh sách người dùng');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadNotificationHistory = async () => {
    setLoadingHistory(true);
    try {
      const notifRef = collection(db, 'notifications');
      const q = query(
        notifRef,
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      
      const notifList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Notification[];
      
      setNotifications(notifList);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadNotificationHistory()]);
    setRefreshing(false);
  }, []);

  const handleSendNotification = async () => {
    if (!title.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tiêu đề thông báo');
      return;
    }
    if (!body.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập nội dung thông báo');
      return;
    }
    
    if (users.length === 0) {
      showAlert('Lỗi', 'Không có người dùng nào để gửi thông báo');
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      showAlert('Lỗi', 'Vui lòng chọn ít nhất một người nhận');
      return;
    }

    const targetUsers = sendToAll ? users.map(u => u.id) : selectedUsers;
    const typeText = notificationType === 'promotion' ? 'khuyến mãi' : 'hệ thống';

    console.log('📤 Sending notification to users:', targetUsers);

    showConfirmDialog(
      'Xác nhận gửi',
      `Bạn có chắc muốn gửi thông báo ${typeText} đến ${targetUsers.length} khách hàng?`,
      async () => {
        setSending(true);
        try {
          const result = await sendBulkNotifications({
            userIds: targetUsers,
            title: title.trim(),
            body: body.trim(),
            type: notificationType,
          });

          console.log('📬 Send result:', result);

          if (result.success) {
            showAlert(
              'Thành công', 
              `Đã gửi ${result.sent} thông báo${result.failed > 0 ? `, ${result.failed} thất bại` : ''}`
            );
            setTitle('');
            setBody('');
            setSelectedUsers([]);
            loadNotificationHistory();
          } else {
            showAlert('Lỗi', result.message);
          }
        } catch (error) {
          console.error('❌ Send error:', error);
          showAlert('Lỗi', 'Không thể gửi thông báo');
        } finally {
          setSending(false);
        }
      }
    );
  };

  const handleDeleteNotification = (notificationId: string) => {
    showConfirmDialog(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa thông báo này?',
      async () => {
        try {
          await deleteDoc(doc(db, 'notifications', notificationId));
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          showAlert('Thành công', 'Đã xóa thông báo');
        } catch (error) {
          showAlert('Lỗi', 'Không thể xóa thông báo');
        }
      }
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotifications = notifications.filter(n => 
    historyFilter === 'all' || n.type === historyFilter
  );

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'promotion': return 'gift';
      case 'system': return 'settings';
      case 'order': return 'cube';
      default: return 'notifications';
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'promotion': return '#F59E0B';
      case 'system': return '#6B7280';
      case 'order': return '#3B82F6';
      default: return '#667eea';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Notification templates
  const promotionTemplates = [
    { title: '🎉 Flash Sale hôm nay!', body: 'Giảm giá đến 50% cho tất cả sản phẩm. Nhanh tay đặt hàng ngay!' },
    { title: '🎁 Ưu đãi đặc biệt', body: 'Nhập mã SALE20 để được giảm 20% cho đơn hàng tiếp theo.' },
    { title: '🔥 Deal hot cuối tuần', body: 'Mua 2 tặng 1 cho tất cả sản phẩm. Chỉ trong 2 ngày!' },
    { title: '💝 Quà tặng miễn phí', body: 'Đơn hàng từ 500K được tặng kèm quà hấp dẫn!' },
  ];

  const systemTemplates = [
    { title: '🔧 Bảo trì hệ thống', body: 'Hệ thống sẽ bảo trì từ 00:00 - 02:00 ngày mai. Xin lỗi vì sự bất tiện.' },
    { title: '📱 Cập nhật ứng dụng', body: 'Phiên bản mới đã có sẵn. Cập nhật để trải nghiệm tính năng mới!' },
    { title: '📋 Thay đổi chính sách', body: 'Chính sách đổi trả đã được cập nhật. Xem chi tiết trong ứng dụng.' },
    { title: '⚠️ Thông báo quan trọng', body: 'Vui lòng cập nhật thông tin tài khoản để đảm bảo an toàn.' },
  ];

  const applyTemplate = (template: { title: string; body: string }) => {
    setTitle(template.title);
    setBody(template.body);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý thông báo</Text>
        <Text style={styles.headerSubtitle}>
          {users.length > 0 ? `${users.length} khách hàng` : 'Đang tải...'}
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.tabActive]}
          onPress={() => setActiveTab('send')}
        >
          <Ionicons 
            name="send" 
            size={18} 
            color={activeTab === 'send' ? '#667eea' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'send' && styles.tabTextActive]}>
            Gửi thông báo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time" 
            size={18} 
            color={activeTab === 'history' ? '#667eea' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Lịch sử
          </Text>
          {notifications.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'send' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Debug Info */}
          {users.length === 0 && !loadingUsers && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text style={styles.warningText}>
                Không tìm thấy khách hàng nào. Hãy kiểm tra collection users trong Firestore.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notification Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loại thông báo</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  notificationType === 'promotion' && styles.typeCardActive,
                  notificationType === 'promotion' && { borderColor: '#F59E0B' },
                ]}
                onPress={() => setNotificationType('promotion')}
              >
                <View style={[styles.typeIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="gift" size={24} color="#F59E0B" />
                </View>
                <Text style={[
                  styles.typeText,
                  notificationType === 'promotion' && { color: '#F59E0B' }
                ]}>
                  Khuyến mãi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  notificationType === 'system' && styles.typeCardActive,
                  notificationType === 'system' && { borderColor: '#6B7280' },
                ]}
                onPress={() => setNotificationType('system')}
              >
                <View style={[styles.typeIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="settings" size={24} color="#6B7280" />
                </View>
                <Text style={[
                  styles.typeText,
                  notificationType === 'system' && { color: '#6B7280' }
                ]}>
                  Hệ thống
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Templates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mẫu có sẵn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(notificationType === 'promotion' ? promotionTemplates : systemTemplates).map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateCard}
                  onPress={() => applyTemplate(template)}
                >
                  <Text style={styles.templateTitle} numberOfLines={1}>
                    {template.title}
                  </Text>
                  <Text style={styles.templateBody} numberOfLines={2}>
                    {template.body}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Notification Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nội dung thông báo</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tiêu đề *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nhập tiêu đề thông báo..."
                placeholderTextColor="#999"
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nội dung *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={body}
                onChangeText={setBody}
                placeholder="Nhập nội dung thông báo..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{body.length}/500</Text>
            </View>
          </View>

          {/* Recipients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Người nhận</Text>
            
            <TouchableOpacity
              style={[styles.recipientOption, sendToAll && styles.recipientOptionActive]}
              onPress={() => setSendToAll(true)}
            >
              <View style={styles.radioButton}>
                {sendToAll && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientTitle}>Tất cả khách hàng</Text>
                <Text style={styles.recipientDesc}>
                  {loadingUsers ? 'Đang tải...' : `${users.length} người dùng`}
                </Text>
              </View>
              <Ionicons name="people" size={24} color={sendToAll ? '#667eea' : '#999'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recipientOption, !sendToAll && styles.recipientOptionActive]}
              onPress={() => {
                setSendToAll(false);
                setShowUserModal(true);
              }}
            >
              <View style={styles.radioButton}>
                {!sendToAll && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientTitle}>Chọn người nhận</Text>
                <Text style={styles.recipientDesc}>
                  {selectedUsers.length > 0 
                    ? `Đã chọn ${selectedUsers.length} người` 
                    : 'Chọn từ danh sách'}
                </Text>
              </View>
              <Ionicons name="person-add" size={24} color={!sendToAll ? '#667eea' : '#999'} />
            </TouchableOpacity>

            {!sendToAll && selectedUsers.length > 0 && (
              <TouchableOpacity 
                style={styles.editSelectionBtn}
                onPress={() => setShowUserModal(true)}
              >
                <Ionicons name="create-outline" size={18} color="#667eea" />
                <Text style={styles.editSelectionText}>Chỉnh sửa danh sách</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (sending || users.length === 0) && styles.sendButtonDisabled
            ]}
            onPress={handleSendNotification}
            disabled={sending || users.length === 0}
          >
            <LinearGradient
              colors={(sending || users.length === 0) ? ['#999', '#888'] : ['#667eea', '#764ba2']}
              style={styles.sendButtonGradient}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.sendButtonText}>
                    Gửi thông báo {sendToAll ? `(${users.length})` : `(${selectedUsers.length})`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* History Tab */
        <View style={styles.historyContainer}>
          {/* Filter */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'all', label: 'Tất cả', icon: 'apps' },
                { key: 'order', label: 'Đơn hàng', icon: 'cube' },
                { key: 'promotion', label: 'Khuyến mãi', icon: 'gift' },
                { key: 'system', label: 'Hệ thống', icon: 'settings' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    historyFilter === filter.key && styles.filterChipActive,
                  ]}
                  onPress={() => setHistoryFilter(filter.key as any)}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={16}
                    color={historyFilter === filter.key ? '#fff' : '#6B7280'}
                  />
                  <Text style={[
                    styles.filterChipText,
                    historyFilter === filter.key && styles.filterChipTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Notification List */}
          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
            </View>
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={({ item }) => (
                <View style={styles.notificationCard}>
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: `${getTypeColor(item.type)}20` }
                  ]}>
                    <Ionicons
                      name={getTypeIcon(item.type) as any}
                      size={24}
                      color={getTypeColor(item.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatTime(item.createdAt as Date)}
                      </Text>
                    </View>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <View style={styles.notificationFooter}>
                      <View style={[
                        styles.typeBadge,
                        { backgroundColor: `${getTypeColor(item.type)}20` }
                      ]}>
                        <Text style={[
                          styles.typeBadgeText,
                          { color: getTypeColor(item.type) }
                        ]}>
                          {item.type === 'promotion' ? 'Khuyến mãi' : 
                           item.type === 'system' ? 'Hệ thống' : 'Đơn hàng'}
                        </Text>
                      </View>
                      <Text style={styles.userIdText}>
                        User: {item.userId?.slice(-8)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => item.id && handleDeleteNotification(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#667eea']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
                </View>
              }
              contentContainerStyle={filteredNotifications.length === 0 ? { flex: 1 } : undefined}
            />
          )}
        </View>
      )}

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người nhận</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm theo tên hoặc email..."
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Select All */}
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={() => {
                if (selectedUsers.length === users.length) {
                  setSelectedUsers([]);
                } else {
                  setSelectedUsers(users.map(u => u.id));
                }
              }}
            >
              <Ionicons
                name={selectedUsers.length === users.length ? 'checkbox' : 'square-outline'}
                size={24}
                color="#667eea"
              />
              <Text style={styles.selectAllText}>
                {selectedUsers.length === users.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Text>
              <Text style={styles.selectedCount}>
                {selectedUsers.length}/{users.length}
              </Text>
            </TouchableOpacity>

            {/* User List */}
            {loadingUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userItem,
                      selectedUsers.includes(item.id) && styles.userItemSelected,
                    ]}
                    onPress={() => toggleUserSelection(item.id)}
                  >
                    <Ionicons
                      name={selectedUsers.includes(item.id) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedUsers.includes(item.id) ? '#667eea' : '#999'}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.displayName}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      <Text style={styles.userId}>ID: {item.id.slice(-8)}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
                  </View>
                }
              />
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.confirmButtonText}>
                Xác nhận ({selectedUsers.length} người)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#667eea',
  },
  tabBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexWrap: 'wrap',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  retryBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeCardActive: {
    borderWidth: 2,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  templateCard: {
    width: 200,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  templateBody: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  recipientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  recipientOptionActive: {
    borderColor: '#667eea',
    backgroundColor: '#F5F3FF',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#667eea',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  recipientDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  editSelectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  editSelectionText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  sendButton: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },

  /* History Tab */
  historyContainer: {
    flex: 1,
    paddingTop: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#667eea',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notificationBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userIdText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    marginLeft: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  selectAllText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  selectedCount: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  userItemSelected: {
    backgroundColor: '#F5F3FF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  userId: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: '#667eea',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default AdminNotificationsScreen;