import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';

const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos');
const COVER_DIR = path.join(UPLOAD_ROOT, 'covers');
ensureDir(VIDEO_DIR);
ensureDir(COVER_DIR);

const safeExt = (name: string): string => {
  const ext = path.extname(name || '').toLowerCase();
  if (!ext || ext.length > 10) return '';
  return ext.replace(/[^a-z0-9.]/g, '');
};

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isCover = file.fieldname === 'cover' || file.fieldname === 'avatar';
    cb(null, isCover ? COVER_DIR : VIDEO_DIR);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(10).toString('hex');
    cb(null, `${Date.now()}_${id}${safeExt(file.originalname)}`);
  }
});

export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

