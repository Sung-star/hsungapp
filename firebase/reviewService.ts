import { db } from '@/config/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
} from 'firebase/firestore';

export interface ProductReview {
  id?: string;
  userId?: string;
  rating: number;
  text: string;
  createdAt: string; // ISO string
  [key: string]: any;
}

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const q = query(collection(db, 'products', productId, 'reviews'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export function onProductReviews(productId: string, cb: (r: ProductReview[]) => void) {
  const q = query(collection(db, 'products', productId, 'reviews'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export async function addProductReview(productId: string, review: Omit<ProductReview, 'id'>) {
  const col = collection(db, 'products', productId, 'reviews');
  return addDoc(col, review);
}

// Migration helper: moves reviews that include `productId` field from users/{uid}/reviews
// into products/{productId}/reviews. It will delete the original review after moving.
export async function migrateUserReviewsToProduct() {
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const u of usersSnap.docs) {
    const uid = u.id;
    const reviewsSnap = await getDocs(collection(db, 'users', uid, 'reviews'));
    for (const r of reviewsSnap.docs) {
      const data = r.data() as any;
      const productId = data?.productId;
      if (productId) {
        await addDoc(collection(db, 'products', productId, 'reviews'), { ...data, migratedFromUserId: uid });
        await deleteDoc(doc(db, 'users', uid, 'reviews', r.id));
      } else {
        // skip reviews without productId: manual mapping required
      }
    }
  }
}
