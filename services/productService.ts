// services/productService.ts
import * as firebaseProductService from '@/firebase/productService';

export const {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} = firebaseProductService;
