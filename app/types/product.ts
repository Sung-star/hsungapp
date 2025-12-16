export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}