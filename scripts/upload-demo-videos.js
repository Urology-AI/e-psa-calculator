#!/usr/bin/env node
/**
 * Upload demo videos to Firebase Storage.
 *
 * Prerequisites:
 *   1. Enable Firebase Storage in the Firebase Console:
 *      https://console.firebase.google.com/project/epsa-30d0b/storage
 *   2. Download a service account key:
 *      Console → Project Settings → Service accounts → Generate new private key
 *      Save as scripts/serviceAccount.json  (already gitignored)
 *   3. Run: node scripts/upload-demo-videos.js
 *
 * Videos expected at: /tmp/epsa_demo_unpacked/ppt/media/
 *   media1.mp4 → videos/demo-pre-screen.mp4   (Part 1 – Pre Screen)
 *   media2.mp4 → videos/demo-with-psa.mp4     (Part 2 – With PSA)
 *   media3.mp4 → videos/demo-with-mri.mp4     (Part 3 – With MRI)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccount.json');
const BUCKET = 'epsa-30d0b.firebasestorage.app';

const UPLOADS = [
  { src: '/tmp/epsa_demo_unpacked/ppt/media/media1.mp4', dest: 'videos/demo-pre-screen.mp4' },
  { src: '/tmp/epsa_demo_unpacked/ppt/media/media2.mp4', dest: 'videos/demo-with-psa.mp4' },
  { src: '/tmp/epsa_demo_unpacked/ppt/media/media3.mp4', dest: 'videos/demo-with-mri.mp4' },
];

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('ERROR: scripts/serviceAccount.json not found.');
  console.error('Download it from: Firebase Console → Project Settings → Service accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  storageBucket: BUCKET,
});

const bucket = admin.storage().bucket();

async function upload({ src, dest }) {
  if (!fs.existsSync(src)) {
    console.error(`  SKIP: ${src} not found`);
    return;
  }
  const sizeMB = (fs.statSync(src).size / 1024 / 1024).toFixed(1);
  console.log(`  Uploading ${path.basename(src)} (${sizeMB} MB) → gs://${BUCKET}/${dest}`);
  await bucket.upload(src, {
    destination: dest,
    metadata: {
      contentType: 'video/mp4',
      cacheControl: 'public, max-age=31536000',
    },
  });
  await bucket.file(dest).makePublic();
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media`;
  console.log(`  Done. Public URL:\n    ${url}\n`);
}

(async () => {
  console.log(`Uploading ${UPLOADS.length} demo videos to Firebase Storage...\n`);
  for (const item of UPLOADS) {
    await upload(item);
  }
  console.log('All done. Videos are now available at /demo.');
})().catch(err => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
