// firebase/orderService.ts
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  note?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ORD${year}${month}${day}${random}`;
}

export async function createOrder(orderData: Order): Promise<string> {
  try {
    const ordersRef = collection(db, 'orders');
    
    const newOrder = {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(ordersRef, newOrder);
    console.log('✅ Order created:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw new Error('Không thể tạo đơn hàng');
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
      return { ...orderSnap.data() } as Order;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting order:', error);
    throw new Error('Không thể tải đơn hàng');
  }
}

export async function getCustomerOrders(customerId: string): Promise<Array<Order & { id: string }>> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('customerId', '==', customerId));
    const snapshot = await getDocs(q);

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<Order & { id: string }>;

    // Sort by createdAt descending
    orders.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return orders;
  } catch (error) {
    console.error('❌ Error getting customer orders:', error);
    throw new Error('Không thể tải danh sách đơn hàng');
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: Order['status']
): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Order status updated:', orderId, status);
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    throw new Error('Không thể cập nhật trạng thái đơn hàng');
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  try {
    await updateOrderStatus(orderId, 'cancelled');
  } catch (error) {
    throw new Error('Không thể hủy đơn hàng');
  }
}

export function getOrderStatusText(status: Order['status']): string {
  const statusMap: Record<Order['status'], string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    preparing: 'Đang chuẩn bị',
    delivering: 'Đang giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  
  return statusMap[status] || status;
}

export function getOrderStatusColor(status: Order['status']): string {
  const colorMap: Record<Order['status'], string> = {
    pending: '#FFA726',
    confirmed: '#42A5F5',
    preparing: '#AB47BC',
    delivering: '#5C6BC0',
    completed: '#66BB6A',
    cancelled: '#EF5350',
  };
  
  return colorMap[status] || '#95a5a6';
}