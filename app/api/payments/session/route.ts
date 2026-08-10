import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PackageModel from '@/lib/models/Package';
import { fallbackStore } from '@/lib/fallbackStore';
import { createPaymentSession, PaymentFlowError, toPublicSession } from '@/lib/payments/sessions';
import {
  NAME_ERROR,
  PHONE_ERROR,
  isValidName,
  isValidPhone,
  normalizeName,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    ''
  );
}

/**
 * Starts a checkout: validates the request, places a temporary hold on the slot
 * and returns the payment instructions. No Booking is created here.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Validated against the raw value, then normalised. Doing it the other way
    // round would repair "John123" into "John" instead of rejecting it.
    const rawName = (body.name || '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = (body.email || '').trim();
    const notes = (body.notes || '').trim();
    const date = (body.date || '').trim();
    const slot = (body.slot || '').trim();
    const slotTime = (body.slotTime || '').trim();
    const packageId = (body.packageId || '').trim();

    if (!rawName || !phone || !date || !slot) {
      return NextResponse.json(
        { error: 'Full Name, Phone Number, Date and Slot are required.' },
        { status: 400 }
      );
    }
    if (!isValidName(rawName)) {
      return NextResponse.json({ error: NAME_ERROR }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }

    const name = normalizeName(rawName);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid booking date.' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${date}T00:00:00`) < today) {
      return NextResponse.json({ error: 'You cannot book a slot in the past.' }, { status: 400 });
    }

    // The price always comes from the server-side package record, never from the client.
    const pkg = await resolvePackage(packageId, body.packageName);
    if (!pkg) {
      return NextResponse.json({ error: 'Select a valid package.' }, { status: 400 });
    }

    const { session, config } = await createPaymentSession({
      name,
      phone,
      email,
      notes,
      packageId: pkg._id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      date,
      slot,
      slotTime,
      clientIp: clientIp(req),
    });

    return NextResponse.json({
      success: true,
      data: await toPublicSession(session, config),
    });
  } catch (error: any) {
    if (error instanceof PaymentFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[payments] session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Could not start the payment.' },
      { status: 500 }
    );
  }
}

async function resolvePackage(
  packageId: string,
  packageName?: string
): Promise<{ _id: string; name: string; price: number } | null> {
  const conn = await connectToDatabase();

  if (conn) {
    try {
      const query = packageId.match(/^[0-9a-fA-F]{24}$/)
        ? { _id: packageId }
        : packageName
        ? { name: packageName }
        : null;
      if (query) {
        const doc: any = await PackageModel.findOne({ ...query, isActive: { $ne: false } }).lean();
        if (doc) return { _id: String(doc._id), name: doc.name, price: Number(doc.price) };
      }
    } catch (e) {
      console.warn('[payments] package lookup failed:', e);
    }
  }

  const fallback = fallbackStore.packages.find(
    (p) => (packageId && p._id === packageId) || (packageName && p.name === packageName)
  );
  if (fallback && fallback.isActive !== false) {
    return { _id: fallback._id || '', name: fallback.name, price: Number(fallback.price) };
  }
  return null;
}
