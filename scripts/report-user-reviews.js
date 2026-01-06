/**
 * Report-only script: lists user reviews that contain `productId`.
 * Usage:
 * 1) Install firebase-admin if not installed: `npm install --save-dev firebase-admin`
 * 2) Set service account JSON for this session:
 *    PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 * 3) Run: `node ./scripts/report-user-reviews.js`
 *
 * Output: prints a summary and writes `scripts/reviews-report.json`.
 */

const fs = require('fs');
const path = require('path');
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

async function report() {
  console.log('Scanning users/*/reviews for productId...');
  const usersSnap = await db.collection('users').get();
  const findings = [];
  for (const u of usersSnap.docs) {
    const uid = u.id;
    const reviewsRef = db.collection('users').doc(uid).collection('reviews');
    const reviewsSnap = await reviewsRef.get();
    for (const r of reviewsSnap.docs) {
      const data = r.data();
      const productId = data?.productId;
      if (productId) {
        findings.push({ userId: uid, reviewId: r.id, productId, data });
      }
    }
  }

  console.log(`Found ${findings.length} user-level review(s) with productId.`);
  const outPath = path.resolve(__dirname, 'reviews-report.json');
  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2), 'utf8');
  console.log(`Wrote report to ${outPath}`);

  // Print first 20 items short summary
  const sample = findings.slice(0, 20).map((f) => ({ userId: f.userId, reviewId: f.reviewId, productId: f.productId, rating: f.data.rating, createdAt: f.data.createdAt }));
  console.log('Sample results:', sample);
}

report().catch((e) => {
  console.error('Report failed:', e);
  process.exit(1);
});
