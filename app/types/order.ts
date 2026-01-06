export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id?: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  status: 'pending' | 'completed' | 'cancelled';
  note?: string;
  createdAt?: any;
  updatedAt?: any;
}