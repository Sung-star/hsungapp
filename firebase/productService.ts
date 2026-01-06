import { db, storage } from '@/config/firebase';
import { Product } from '@/types/product';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

// helper: convert Firestore Timestamp to Date
const convertTimestamp = (ts: any): Date | undefined => {
  if (!ts) return undefined;
  if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return undefined;
};

// ✅ UPLOAD IMAGE TO FIREBASE STORAGE
export const uploadProductImage = async (
  uri: string,
  productId: string
): Promise<string> => {
  try {
    console.log('📤 Uploading image:', uri);

    // Fetch image as blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create unique filename
    const timestamp = Date.now();
    const filename = `products/${productId}_${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    console.log('📁 Storage path:', filename);

    // Upload to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('✅ Upload success:', snapshot.metadata.fullPath);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 Download URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// ✅ GET ALL PRODUCTS
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt) || new Date(),
      updatedAt: convertTimestamp(doc.data().updatedAt) || new Date(),
    })) as unknown as Product[];

    console.log('📦 Loaded products:', products.length);
    return products;
  } catch (error) {
    console.error('❌ Error getting products:', error);
    return [];
  }
};

// ✅ GET PRODUCT BY ID
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('❌ Product not found:', id);
      return null;
    }

    const product = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: convertTimestamp(docSnap.data().createdAt) || new Date(),
      updatedAt: convertTimestamp(docSnap.data().updatedAt) || new Date(),
    } as unknown as Product;

    console.log('✅ Product loaded:', product.name);
    return product;
  } catch (error) {
    console.error('❌ Error getting product:', error);
    return null;
  }
};

// ✅ ADD PRODUCT
export const addProduct = async (product: Omit<Product, 'id'>): Promise<string> => {
  try {
    console.log('📝 Adding product:', product.name);

    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      imageUrl: product.imageUrl || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Product added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding product:', error);
    throw error;
  }
};

// ✅ UPDATE PRODUCT
export const updateProduct = async (
  id: string,
  data: Partial<Product>
): Promise<void> => {
  try {
    console.log('📝 Updating product:', id);

    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Product updated');
  } catch (error) {
    console.error('❌ Error updating product:', error);
    throw error;
  }
};

// ✅ DELETE PRODUCT (và xóa ảnh)
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting product:', id);

    // Get product to get image URL
    const product = await getProductById(id);

    // Delete from Firestore
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);

    // Delete image from Storage if exists
    if (product?.imageUrl && product.imageUrl.startsWith('https')) {
  try {
    const imageRef = ref(storage, product.imageUrl);
await deleteObject(imageRef);

    console.log('✅ Image deleted from Storage');
  } catch (err) {
    console.log('⚠️ Could not delete image:', err);
  }
}


    console.log('✅ Product deleted');
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }
};