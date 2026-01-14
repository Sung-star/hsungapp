// types/order.ts - Updated with shipping & voucherCode fields

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'delivering' 
  | 'completed' 
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  address?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  voucherCode?: string;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  status: OrderStatus;
  note?: string;
  createdAt: Date | null;
  updatedAt?: Date | null;
}