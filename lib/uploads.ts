import path from 'path';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb';
import Upload from '@/lib/models/Upload';
import { fallbackStore } from '@/lib/fallbackStore';
import { IStoredUpload } from '@/types';

/**
 * Uploads are persisted in MongoDB, not on the filesystem.
 *
 * Writing to public/uploads works on a laptop and fails in production: the app is
 * deployed to a serverless runtime where the bundle (/var/task) is read-only, so
 * fs.writeFile there throws ENOENT and the whole payment submission fails. Even on
 * hosts that allow writes to a temp directory, the container is discarded between
 * requests and the screenshot would be gone before an admin ever sees it.
 */

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

const EXTENSION_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

function resolveContentType(file: File, ext: string): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  return EXTENSION_MIME[ext] || 'application/octet-stream';
}

/** Persists an uploaded file and returns the URL that serves it back. */
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const filename = `${prefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const contentType = resolveContentType(file, ext);

  const record = {
    filename,
    contentType,
    size: buffer.length,
    hash,
    kind: prefix,
    data: buffer,
  };

  const conn = await connectToDatabase();
  if (conn) {
    try {
      const created = await Upload.create(record as any);
      return { url: `/api/uploads/${String(created._id)}`, hash, size: buffer.length };
    } catch (e) {
      console.warn('[uploads] DB write failed, using in-memory store:', e);
    }
  }

  // No database reachable (local dev without Mongo). Hold the file in the same
  // process-memory store the rest of the app falls back to, so the flow still
  // completes end to end — it does not survive a restart.
  const id = `mem-${crypto.randomUUID()}`;
  fallbackStore.uploads.unshift({
    _id: id,
    ...record,
    createdAt: new Date().toISOString(),
  });
  // Keep the fallback store from growing without bound in a long dev session.
  if (fallbackStore.uploads.length > 50) fallbackStore.uploads.length = 50;

  return { url: `/api/uploads/${id}`, hash, size: buffer.length };
}

/**
 * Normalises whatever the driver hands back for a binary field. A lean read yields
 * a BSON Binary (whose .buffer is the Buffer), a hydrated read yields a Buffer
 * subclass. Going through a raw ArrayBuffer would be wrong for a pooled Buffer,
 * so each case is handled on its own terms.
 */
function toBuffer(value: any): Buffer {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (Buffer.isBuffer(value.buffer)) return value.buffer; // BSON Binary
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return Buffer.from(value);
}

/** Reads a stored upload back, from the database or the in-memory fallback. */
export async function findUpload(id: string): Promise<IStoredUpload | null> {
  if (!id) return null;

  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    const conn = await connectToDatabase();
    if (conn) {
      try {
        const doc: any = await Upload.findById(id).lean();
        if (doc) {
          return {
            _id: String(doc._id),
            filename: doc.filename,
            contentType: doc.contentType,
            size: doc.size,
            hash: doc.hash,
            kind: doc.kind,
            data: toBuffer(doc.data),
            createdAt: doc.createdAt?.toISOString?.(),
          };
        }
      } catch (e) {
        console.warn('[uploads] DB read failed:', e);
      }
    }
  }

  return fallbackStore.uploads.find((u) => u._id === id) || null;
}
