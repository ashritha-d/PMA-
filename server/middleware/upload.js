const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { hasAllowedFileSignature } = require('../utils/fileSignature');

// ── Fast first-pass filter (extension + declared MIME type) ────────────────
// Cheap to check, but both fields are fully client-controlled and therefore
// spoofable — this alone is NOT sufficient, which is why every file is also
// content-verified (see verifyContent below) before it's persisted.
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only images and PDFs are allowed'));
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// Buffer everything in memory first — this is what makes real content
// verification possible for both the local-disk and Cloudinary paths, since
// neither a disk stream nor a Cloudinary upload stream can be "peeked at"
// and rejected mid-flight without buffering first.
const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const destFolderFor = (fieldname) => (fieldname === 'images' ? 'properties' : 'documents');

// ── Persist one already-verified file, preserving the exact `.path` /
// `.filename` contract every route already reads (`f.path?.startsWith('http')
// ? f.path : \`/uploads/.../${f.filename}\``) — routes need zero changes.
async function persistFile(file) {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const folder = destFolderFor(file.fieldname) === 'properties' ? 'pma/properties' : 'pma/documents';
    const isImage = file.mimetype.startsWith('image/');
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: isImage ? [{ width: 1200, quality: 'auto', fetch_format: 'auto' }] : undefined,
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    file.path = result.secure_url;
    file.filename = result.public_id;
  } else {
    const dir = path.join(__dirname, '../uploads', destFolderFor(file.fieldname));
    ensureDir(dir);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    file.path = path.join(dir, filename);
    file.filename = filename;
  }
}

function collectFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

// ── After multer has buffered the file(s), verify real content, then persist ──
async function verifyAndPersist(req, res, next) {
  try {
    const files = collectFiles(req);
    for (const file of files) {
      if (!hasAllowedFileSignature(file.buffer)) {
        return res.status(400).json({
          success: false,
          message: `"${file.originalname}" does not appear to be a valid image or PDF file (content check failed).`,
        });
      }
    }
    for (const file of files) {
      await persistFile(file);
    }
    next();
  } catch (err) {
    next(err);
  }
}

function withMulterStep(multerMiddleware) {
  return [
    (req, res, next) => multerMiddleware(req, res, (err) => (err ? next(err) : next())),
    verifyAndPersist,
  ];
}

module.exports = {
  single: (field) => withMulterStep(multerUpload.single(field)),
  array: (field, max) => withMulterStep(multerUpload.array(field, max)),
  fields: (fieldsConfig) => withMulterStep(multerUpload.fields(fieldsConfig)),
};
