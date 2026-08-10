import { NextResponse } from 'next/server';
import { findUpload } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/**
 * Serves a file stored by lib/uploads.ts — payment screenshots, resumes and the
 * static UPI QR. This replaces the static /uploads/<name> path, which cannot work
 * on a serverless host with a read-only filesystem.
 *
 * The id is an unguessable ObjectId, matching the exposure the public/uploads
 * directory had before.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const upload = await findUpload(id);

    if (!upload) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    // Slice out just this file's bytes — a Buffer can be a view into a larger
    // pooled allocation, so its backing ArrayBuffer must not be sent whole.
    const bytes = upload.data;
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upload.contentType || 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `inline; filename="${upload.filename.replace(/"/g, '')}"`,
        // Contents are immutable once written — the id changes with every upload.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('[uploads] serve error:', error);
    return NextResponse.json({ error: 'Could not load the file.' }, { status: 500 });
  }
}
