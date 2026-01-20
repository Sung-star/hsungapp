// app/statistics.tsx - Admin Statistics Dashboard

import { getAllOrders } from '@/firebase/orderService';
import { getAllProducts } from '@/firebase/productService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Order } from '@/types/order';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

type TimeRange = 'week' | 'month' | 'year';

interface DailyStats {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

interface ProductStats {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export default function StatisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
  });

  const loadData = async () => {
    try {
      const [ordersData, productsData] = await Promise.all([
        getAllOrders(),
        getAllProducts(),
      ]);
      
      setOrders(ordersData);
      calculateStats(ordersData, timeRange);
      calculateTopProducts(ordersData);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[], range: TimeRange) => {
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let labels: string[] = [];
    
    // Xác định khoảng thời gian
    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(d.toLocaleDateString('vi-VN', { weekday: 'short' }));
        }
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          labels.push(i.toString());
        }
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        break;
    }

    // Filter đơn hàng trong khoảng thời gian
    const filteredOrders = ordersData.filter(o => 
      o.createdAt && o.createdAt >= startDate && o.status !== 'cancelled'
    );
    
    const previousOrders = ordersData.filter(o => 
      o.createdAt && o.createdAt >= previousStartDate && o.createdAt < startDate && o.status !== 'cancelled'
    );

    // Tính tổng doanh thu & đơn hàng
    const totalRevenue = filteredOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const previousRevenue = previousOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const cancelledOrders = ordersData.filter(o => 
      o.createdAt && o.createdAt >= startDate && o.status === 'cancelled'
    ).length;

    // Tính growth
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    const ordersGrowth = previousOrders.length > 0 
      ? ((filteredOrders.length - previousOrders.length) / previousOrders.length) * 100 
      : 0;

    setSummary({
      totalRevenue,
      totalOrders: filteredOrders.length,
      completedOrders,
      cancelledOrders,
      averageOrderValue: filteredOrders.length > 0 ? totalRevenue / completedOrders : 0,
      revenueGrowth,
      ordersGrowth,
    });

    // Tính daily stats cho biểu đồ
    const daily: DailyStats[] = [];
    
    if (range === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayOrders = filteredOrders.filter(o => 
          o.createdAt && o.createdAt.toDateString() === d.toDateString()
        );
        daily.push({
          date: d.toISOString(),
          label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
          revenue: dayOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
          orders: dayOrders.length,
        });
      }
    } else if (range === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const dayOrders = filteredOrders.filter(o => 
          o.createdAt && o.createdAt.getDate() === i && o.createdAt.getMonth() === now.getMonth()
        );
        daily.push({
          date: d.toISOString(),
          label: i.toString(),
          revenue: dayOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
          orders: dayOrders.length,
        });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const monthOrders = filteredOrders.filter(o => 
          o.createdAt && o.createdAt.getMonth() === i
        );
        daily.push({
          date: new Date(now.getFullYear(), i, 1).toISOString(),
          label: `T${i + 1}`,
          revenue: monthOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
          orders: monthOrders.length,
        });
      }
    }
    
    setDailyStats(daily);
  };

  const calculateTopProducts = (ordersData: Order[]) => {
    const productMap = new Map<string, ProductStats>();
    
    const completedOrders = ordersData.filter(o => o.status === 'completed');
    
    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.total || (item.price * item.quantity);
        } else {
          productMap.set(item.productId, {
            id: item.productId,
            name: item.productName,
            quantity: item.quantity,
            revenue: item.total || (item.price * item.quantity),
          });
        }
      });
    });
    
    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    setTopProducts(sorted);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      calculateStats(orders, timeRange);
    }
  }, [timeRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Tìm max value cho biểu đồ
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);
  const maxOrders = Math.max(...dailyStats.map(d => d.orders), 1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Đang tải thống kê...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thống kê doanh thu</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeBtn, timeRange === range && styles.timeRangeBtnActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range === 'week' ? '7 ngày' : range === 'month' ? 'Tháng này' : 'Năm nay'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardLarge]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="wallet" size={24} color="#22C55E" />
              </View>
              <View style={[
                styles.growthBadge,
                { backgroundColor: summary.revenueGrowth >= 0 ? '#DCFCE7' : '#FEE2E2' }
              ]}>
                <Ionicons 
                  name={summary.revenueGrowth >= 0 ? 'trending-up' : 'trending-down'} 
                  size={14} 
                  color={summary.revenueGrowth >= 0 ? '#22C55E' : '#EF4444'} 
                />
                <Text style={[
                  styles.growthText,
                  { color: summary.revenueGrowth >= 0 ? '#22C55E' : '#EF4444' }
                ]}>
                  {Math.abs(summary.revenueGrowth).toFixed(1)}%
                </Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="receipt" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.summaryValueSmall}>{summary.totalOrders}</Text>
            <Text style={styles.summaryLabelSmall}>Đơn hàng</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calculator" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.summaryValueSmall}>{formatCurrency(summary.averageOrderValue)}</Text>
            <Text style={styles.summaryLabelSmall}>TB/Đơn</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            </View>
            <Text style={styles.summaryValueSmall}>{summary.completedOrders}</Text>
            <Text style={styles.summaryLabelSmall}>Hoàn thành</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </View>
            <Text style={styles.summaryValueSmall}>{summary.cancelledOrders}</Text>
            <Text style={styles.summaryLabelSmall}>Đã hủy</Text>
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📈 Biểu đồ doanh thu</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue)}</Text>
              <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue / 2)}</Text>
              <Text style={styles.yAxisLabel}>0</Text>
            </View>
            
            {/* Bars */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barsContainer}>
              <View style={styles.barsWrapper}>
                {dailyStats.map((stat, index) => {
                  const barHeight = maxRevenue > 0 ? (stat.revenue / maxRevenue) * 120 : 0;
                  const isToday = new Date(stat.date).toDateString() === new Date().toDateString();
                  
                  return (
                    <View key={index} style={styles.barItem}>
                      <Text style={styles.barValue}>
                        {stat.revenue > 0 ? formatCurrency(stat.revenue) : ''}
                      </Text>
                      <View style={styles.barBackground}>
                        <LinearGradient
                          colors={isToday ? ['#22C55E', '#16A34A'] : ['#86EFAC', '#4ADE80']}
                          style={[styles.bar, { height: Math.max(barHeight, 4) }]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                        {stat.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Orders Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📦 Số đơn hàng</Text>
          </View>
          
          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              <Text style={styles.yAxisLabel}>{maxOrders}</Text>
              <Text style={styles.yAxisLabel}>{Math.floor(maxOrders / 2)}</Text>
              <Text style={styles.yAxisLabel}>0</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barsContainer}>
              <View style={styles.barsWrapper}>
                {dailyStats.map((stat, index) => {
                  const barHeight = maxOrders > 0 ? (stat.orders / maxOrders) * 120 : 0;
                  const isToday = new Date(stat.date).toDateString() === new Date().toDateString();
                  
                  return (
                    <View key={index} style={styles.barItem}>
                      <Text style={styles.barValue}>
                        {stat.orders > 0 ? stat.orders : ''}
                      </Text>
                      <View style={styles.barBackground}>
                        <LinearGradient
                          colors={isToday ? ['#3B82F6', '#2563EB'] : ['#93C5FD', '#60A5FA']}
                          style={[styles.bar, { height: Math.max(barHeight, 4) }]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && styles.barLabelActiveBlue]}>
                        {stat.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.topProductsCard}>
          <Text style={styles.chartTitle}>🏆 Top sản phẩm bán chạy</Text>
          
          {topProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
            </View>
          ) : (
            topProducts.map((product, index) => {
              const percentage = topProducts[0].revenue > 0 
                ? (product.revenue / topProducts[0].revenue) * 100 
                : 0;
              
              return (
                <View key={product.id} style={styles.productItem}>
                  <View style={styles.productRank}>
                    <Text style={[
                      styles.productRankText,
                      index === 0 && styles.productRankGold,
                      index === 1 && styles.productRankSilver,
                      index === 2 && styles.productRankBronze,
                    ]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <View style={styles.productStats}>
                      <Text style={styles.productQuantity}>{product.quantity} đã bán</Text>
                      <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Order Status Distribution */}
        <View style={styles.statusCard}>
          <Text style={styles.chartTitle}>📊 Phân bố trạng thái đơn hàng</Text>
          
          <View style={styles.statusGrid}>
            {[
              { status: 'pending', label: 'Chờ xác nhận', color: '#F59E0B', icon: 'time' },
              { status: 'confirmed', label: 'Đã xác nhận', color: '#3B82F6', icon: 'checkmark' },
              { status: 'preparing', label: 'Đang chuẩn bị', color: '#8B5CF6', icon: 'restaurant' },
              { status: 'delivering', label: 'Đang giao', color: '#06B6D4', icon: 'bicycle' },
              { status: 'completed', label: 'Hoàn thành', color: '#22C55E', icon: 'checkmark-done' },
              { status: 'cancelled', label: 'Đã hủy', color: '#EF4444', icon: 'close' },
            ].map(item => {
              const count = orders.filter(o => o.status === item.status).length;
              const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
              
              return (
                <View key={item.status} style={styles.statusItem}>
                  <View style={[styles.statusIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.statusCount}>{count}</Text>
                  <Text style={styles.statusLabel}>{item.label}</Text>
                  <Text style={styles.statusPercent}>{percentage.toFixed(1)}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  timeRangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeRangeBtnActive: {
    backgroundColor: '#22C55E',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: 'white',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryCard: {
    width: (width - 50) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardLarge: {
    width: '100%',
    marginBottom: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryValueSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryLabelSmall: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180,
  },
  yAxis: {
    width: 45,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    minWidth: '100%',
  },
  barItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 36,
  },
  barValue: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
    height: 14,
  },
  barBackground: {
    width: 28,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
  },
  barLabelActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  barLabelActiveBlue: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  topProductsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  productRankGold: {
    color: '#F59E0B',
  },
  productRankSilver: {
    color: '#6B7280',
  },
  productRankBronze: {
    color: '#D97706',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  productRevenue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  statusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 10,
  },
  statusItem: {
    width: (width - 70) / 3,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  statusPercent: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});