import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { existsSync, mkdirSync } from 'fs';

export const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

try {
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Uploads directory creation warning:', e);
}

export interface SaveFileOptions {
  prefix?: string;
  maxBytes?: number;
  allowedMimes?: string[];
  allowedExtensions?: string[];
}

export interface SavedFile {
  url: string;
  /** SHA-256 of the file contents — used to detect the same file being submitted twice. */
  hash: string;
  size: number;
}

/** Persists an uploaded file under /public/uploads and returns its public URL and hash. */
export async function saveUploadedFile(
  file: File,
  options: SaveFileOptions = {}
): Promise<SavedFile | null> {
  if (!file || typeof file !== 'object' || !file.name) return null;

  const {
    prefix = 'file',
    maxBytes = 5 * 1024 * 1024,
    allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'],
  } = options;

  const ext = path.extname(file.name).toLowerCase();
  const mimeOk = allowedMimes.length === 0 || allowedMimes.includes(file.type);
  const extOk = allowedExtensions.length === 0 || allowedExtensions.includes(ext);

  if (!mimeOk && !extOk) {
    throw new Error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`);
  }
  if (file.size === 0) {
    throw new Error('The uploaded file is empty.');
  }
  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const safeName = `${prefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  await fs.writeFile(path.join(uploadsDir, safeName), buffer);

  return { url: `/uploads/${safeName}`, hash, size: buffer.length };
}
