// firebase/orderService.ts
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  orderBy,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Order, OrderStatus, OrderItem } from '@/types/order';

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ORD${year}${month}${day}${random}`;
}

// Helper function to convert Firestore data to Order
function convertFirestoreToOrder(id: string, data: any): Order {
  return {
    id,
    orderNumber: data.orderNumber || '',
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    customerId: data.customerId,
    address: data.address,
    items: data.items || [],
    subtotal: data.subtotal || 0,
    discount: data.discount || 0,
    total: data.total || 0,
    paymentMethod: data.paymentMethod || 'cash',
    status: data.status as OrderStatus,
    note: data.note,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  };
}

export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
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

    if (!orderSnap.exists()) {
      return null;
    }

    return convertFirestoreToOrder(orderSnap.id, orderSnap.data());
  } catch (error) {
    console.error('❌ Error getting order:', error);
    throw new Error('Không thể tải đơn hàng');
  }
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => convertFirestoreToOrder(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting customer orders:', error);
    throw new Error('Không thể tải danh sách đơn hàng');
  }
}

export async function getAllOrders(): Promise<Order[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    );

    return snapshot.docs.map(doc => convertFirestoreToOrder(doc.id, doc.data()));
  } catch (error) {
    console.error('❌ Error getting all orders:', error);
    throw new Error('Không thể tải danh sách đơn hàng');
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus
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

export async function deleteOrder(orderId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    console.log('✅ Order deleted:', orderId);
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    throw new Error('Không thể xóa đơn hàng');
  }
}

export function getOrderStatusText(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    preparing: 'Đang chuẩn bị',
    delivering: 'Đang giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  
  return statusMap[status] || status;
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    pending: '#FFA726',
    confirmed: '#42A5F5',
    preparing: '#AB47BC',
    delivering: '#5C6BC0',
    completed: '#66BB6A',
    cancelled: '#EF5350',
  };
  
  return colorMap[status] || '#95a5a6';
}