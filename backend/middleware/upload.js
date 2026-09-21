/* File uploads (multer, local disk).
   - Avatars: 1 image (jpeg/png/webp), max 2MB  -> uploads/avatars/
   - KYC docs: up to 3 files (image or PDF), max 5MB each -> uploads/kyc/
   - Review photos: up to 3 images, max 2MB each -> uploads/reviews/
   Files are served at /uploads/... (see server.js). For production
   object storage, replace `diskStorage` destination with an S3 adapter —
   the route contracts stay the same. */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
for (const sub of ['avatars', 'kyc', 'reviews', 'chat']) {
  fs.mkdirSync(path.join(ROOT, sub), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = req.uploadSub || 'avatars';
    cb(null, path.join(ROOT, sub));
  },
  filename: (req, file, cb) => {
    const safe = String(req.user && req.user.id || 'anon').replace(/[^A-Za-z0-9_-]/g, '');
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 5);
    cb(null, `${safe}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];

function fileFilter(allowed) {
  return (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: ' + allowed.join(', ')));
  };
}

function withSub(sub, upload) {
  return (req, res, next) => {
    req.uploadSub = sub;
    upload(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large.' : (err.message || 'Upload failed.');
        return res.status(400).json({ error: msg });
      }
      next();
    });
  };
}

const avatarUpload = withSub('avatars', multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: fileFilter(IMAGE_TYPES),
}).single('avatar'));

const kycUpload = withSub('kyc', multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: fileFilter(DOC_TYPES),
}).array('documents', 3));

const reviewUpload = withSub('reviews', multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 3 },
  fileFilter: fileFilter(IMAGE_TYPES),
}).array('photos', 3));

const chatUpload = withSub('chat', multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: fileFilter(DOC_TYPES),
}).single('file'));

// Public URL for a stored file (works behind proxies via relative path).
function publicUrl(req, sub, filename) {
  return `/uploads/${sub}/${filename}`;
}

/* Cloudinary unsigned uploads (no new deps, pure fetch).
 * Set CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET (unsigned preset)
 * and files are pushed to the cloud after multer's local save, then the
 * local copy is deleted. Without env vars everything stays local.
 * Render/Railway disks are ephemeral — set these in production or
 * avatars/KYC/photos vanish on every redeploy. */
function cloudEnabled() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET);
}

async function pushToCloudinary(sub, file) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const buf = fs.readFileSync(file.path);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: file.mimetype || 'application/octet-stream' }), file.originalname || 'upload');
  form.append('upload_preset', preset);
  form.append('folder', `cheapflix/${sub}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: 'POST', body: form });
  const text = await res.text();
  if (!res.ok) throw new Error('Cloud upload failed: ' + text.slice(0, 160));
  return JSON.parse(text).secure_url;
}

/* Resolve the durable URL for a multer-saved file.
 * Order: Neon Object Storage -> Cloudinary -> local /uploads/...
 * Neon files come back as /api/files/<key> (served via presigned redirect).
 * Never throws — falls back down the chain on errors. */
async function storeFile(req, sub, file) {
  const local = publicUrl(req, sub, file.filename);
  const { neonEnabled, putFile } = require('../utils/storage');
  if (neonEnabled()) {
    try {
      const key = await putFile(sub, file);
      fs.unlink(file.path, () => {});
      return `/api/files/${key}`;
    } catch (e) {
      console.error('[upload] neon storage failed, trying next:', e.message);
    }
  }
  if (!cloudEnabled()) return local;
  try {
    const url = await pushToCloudinary(sub, file);
    fs.unlink(file.path, () => {});
    return url;
  } catch (e) {
    console.error('[upload] cloud failed, keeping local:', e.message);
    return local;
  }
}

module.exports = { avatarUpload, kycUpload, reviewUpload, chatUpload, publicUrl, storeFile, cloudEnabled, UPLOAD_ROOT: ROOT };
