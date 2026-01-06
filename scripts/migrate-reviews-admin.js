/**
 * Migration script (Node) using firebase-admin.
 *
 * Usage:
 * 1) Install firebase-admin: `npm install -D firebase-admin`
 * 2) Set service account JSON path: `set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json` (Windows) or export on Unix
 * 3) Run: `node ./scripts/migrate-reviews-admin.js`
 *
 * This script moves documents from `users/{uid}/reviews` that contain a `productId`
 * into `products/{productId}/reviews` and deletes the original.
 */

const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
} catch (err) {
  console.error('Failed to initialize firebase-admin:', err);
  process.exit(1);
}

const db = admin.firestore();

async function migrate() {
  console.log('Starting migration: users/*/reviews -> products/{productId}/reviews');
  const usersSnap = await db.collection('users').get();
  for (const u of usersSnap.docs) {
    const uid = u.id;
    const reviewsRef = db.collection('users').doc(uid).collection('reviews');
    const reviewsSnap = await reviewsRef.get();
    console.log(`User ${uid}: ${reviewsSnap.size} review(s)`);
    for (const r of reviewsSnap.docs) {
      const data = r.data();
      const productId = data?.productId;
      if (productId) {
        await db.collection('products').doc(productId).collection('reviews').add({ ...data, migratedFromUserId: uid });
        await reviewsRef.doc(r.id).delete();
        console.log(`  Migrated review ${r.id} -> products/${productId}/reviews`);
      } else {
        console.log(`  Skipped review ${r.id} (no productId)`);
      }
    }
  }
  console.log('Migration complete');
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
