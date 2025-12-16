import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';

export async function uploadProductImage(uri: string, productId: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const filePath = `products/${productId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, filePath);

  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}


// ✅ Add product
export async function addProduct(data: any) {
  const docRef = await addDoc(collection(db, 'products'), data);
  return docRef.id;
}

// ✅ Get all products ✅ (THÊM)
export async function getAllProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ✅ Get by id
export async function getProductById(id: string) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ✅ Update
export async function updateProduct(id: string, data: any) {
  await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

// ✅ Delete product ✅ (THÊM)
export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id));
}
function isLocalUri(uri: string) {
  return uri.startsWith('file://') || uri.startsWith('blob:');
}

