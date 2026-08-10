import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import Slot from '@/lib/models/Slot';
import { generateBookingId } from '@/lib/utils';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/uploads';
import { bookingOccupiesSlot, OCCUPYING_BOOKING_FILTER, PAYMENT_STATUS } from '@/lib/statuses';
import { getActiveHoldsForDate } from '@/lib/payments/sessions';
import {
  NAME_ERROR,
  PHONE_ERROR,
  isValidName,
  isValidPhone,
  normalizeName,
} from '@/lib/validation';
import { IBooking } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const phone = searchParams.get('phone');
    const bookingId = searchParams.get('bookingId');

    const conn = await connectToDatabase();
    let query: any = {};

    if (date) query.date = date;
    if (phone) query.phone = phone;
    if (bookingId) query.bookingId = bookingId;

    let list: IBooking[] = [];
    if (conn) {
      list = (await Booking.find(query).sort({ createdAt: -1 }).lean()) as unknown as IBooking[];
    } else {
      list = fallbackStore.bookings.filter((b) => {
        if (date && b.date !== date) return false;
        if (phone && b.phone !== phone) return false;
        if (bookingId && b.bookingId !== bookingId) return false;
        return true;
      });
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * Admin-only booking creation.
 *
 * Customer bookings are NEVER created here — they are created by
 * lib/payments/sessions.ts once a payment has been verified. Posting to this
 * endpoint without an admin session is rejected, which is what stops a page
 * refresh, a replayed request or a hand-crafted call from reserving a slot.
 */
export async function POST(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          error:
            'Bookings are created only after a verified payment. Start a checkout at /api/payments/session.',
          code: 'payment_required',
        },
        { status: 403 }
      );
    }

    let name = '';
    let email = '';
    let phone = '';
    let date = '';
    let slot = '';
    let notes = '';
    let packageName = 'Standard Package';
    let packagePrice: number | null = 500;
    let resumeUrl = '';
    let status: any = 'Approved';
    let markPaid = false;
    let paymentProofUrl = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await req.json();
      name = json.name || '';
      email = json.email || '';
      phone = json.phone || '';
      date = json.date || '';
      slot = json.slot || '';
      notes = json.notes || '';
      packageName = json.packageName || 'Standard Package';
      packagePrice = json.packagePrice !== undefined ? Number(json.packagePrice) : 500;
      if (json.status) status = json.status;
      markPaid = Boolean(json.markPaid);
    } else {
      const formData = await req.formData();
      name = (formData.get('name') as string) || '';
      email = (formData.get('email') as string) || '';
      phone = (formData.get('phone') as string) || '';
      date = (formData.get('date') as string) || '';
      slot = (formData.get('slot') as string) || '';
      notes = (formData.get('notes') as string) || '';
      packageName = (formData.get('packageName') as string) || 'Standard Package';
      const pStr = formData.get('packagePrice') as string;
      packagePrice = pStr ? Number(pStr) : 500;
      const stStr = formData.get('status') as string;
      if (stStr) status = stStr;
      markPaid = formData.get('markPaid') === 'true';

      const proofFile = formData.get('paymentProof') as File | null;
      if (proofFile && typeof proofFile === 'object' && proofFile.name) {
        try {
          const savedProof = await saveUploadedFile(proofFile, { prefix: 'payment' });
          paymentProofUrl = savedProof?.url || '';
        } catch (e) {
          return NextResponse.json({ error: (e as Error).message }, { status: 400 });
        }
      }

      const resumeFile = formData.get('resume') as File | null;
      if (resumeFile && typeof resumeFile === 'object' && resumeFile.name) {
        try {
          const savedResume = await saveUploadedFile(resumeFile, {
            prefix: 'resume',
            maxBytes: 10 * 1024 * 1024,
            allowedMimes: ['application/pdf'],
            allowedExtensions: ['.pdf'],
          });
          resumeUrl = savedResume?.url || '';
        } catch (e) {
          console.warn('Resume upload rejected:', e);
        }
      }
    }

    name = name.trim();
    phone = phone.trim();

    if (!name || !phone || !date || !slot) {
      return NextResponse.json(
        { error: 'Required fields (Full Name, Phone Number, Date, Slot) must be provided.' },
        { status: 400 }
      );
    }

    // Same rules the customer checkout enforces — validate the raw value, then
    // normalise, so an admin cannot store a name or number the public form
    // would have refused.
    if (!isValidName(name)) {
      return NextResponse.json({ error: NAME_ERROR }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }
    name = normalizeName(name);

    const conn = await connectToDatabase();

    // Refuse to overwrite a confirmed booking.
    if (conn) {
      try {
        const existingBooking = await Booking.findOne({
          date,
          slot,
          ...OCCUPYING_BOOKING_FILTER,
        }).lean();

        if (existingBooking) {
          return NextResponse.json(
            {
              error: `Slot "${slot}" on ${date} is already booked by ${(existingBooking as any).name}.`,
              bookedBy: (existingBooking as any).name,
            },
            { status: 409 }
          );
        }
      } catch (e) {
        console.warn('DB findOne failed during duplicate check:', e);
      }
    } else {
      const existingFallback = fallbackStore.bookings.find(
        (b) => b.date === date && b.slot === slot && bookingOccupiesSlot(b.status)
      );
      if (existingFallback) {
        return NextResponse.json(
          {
            error: `Slot "${slot}" on ${date} is already booked by ${existingFallback.name}.`,
            bookedBy: existingFallback.name,
          },
          { status: 409 }
        );
      }
    }

    // Refuse to steal a slot a customer is actively paying for.
    const holds = await getActiveHoldsForDate(date);
    const conflictingHold = holds.find((h) => h.slot === slot || h.slotTime === slot);
    if (conflictingHold) {
      return NextResponse.json(
        {
          error: `Slot "${slot}" on ${date} is currently held by ${conflictingHold.name} while they complete payment (${conflictingHold.status}). Wait for the hold to clear or resolve it from the Payments page.`,
          code: 'slot_held',
        },
        { status: 409 }
      );
    }

    const bookingId = generateBookingId();
    const nowIso = new Date().toISOString();

    const newBookingData: IBooking = {
      bookingId,
      name,
      email: email ? email.trim().toLowerCase() : 'adminbooking@morexpert.com',
      phone,
      resume: resumeUrl,
      notes: notes.trim(),
      date,
      slot,
      status: status || 'Approved',
      price: packagePrice,
      packageName,
      packagePrice,
      bookingSource: 'Admin',
      remarks: 'Created directly from Admin Panel',
      paymentStatus: markPaid ? PAYMENT_STATUS.VERIFIED : PAYMENT_STATUS.PENDING,
      paymentProvider: 'upi-manual',
      paymentProofUrl,
      amountPaid: markPaid ? packagePrice : null,
      paidAt: markPaid ? nowIso : null,
      paymentVerifiedAt: markPaid ? nowIso : null,
      paymentVerifiedBy: markPaid ? admin.name : '',
      verificationMode: markPaid ? 'admin' : undefined,
      createdAt: nowIso,
      timeline: [
        {
          title: 'Booking created from Admin Panel',
          timestamp: nowIso,
          actor: admin.name,
          notes: markPaid ? 'Marked as paid by admin.' : 'Payment not recorded.',
        },
      ],
    };

    let createdBooking: any = null;

    if (conn) {
      try {
        createdBooking = await Booking.create(newBookingData as any);

        await Slot.findOneAndUpdate(
          { date, time: slot },
          { $inc: { booked: 1 } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('DB creation failed, pushing to fallback store:', err);
      }
    }

    if (!createdBooking) {
      const fallbackBooking: IBooking = {
        _id: `b-${Date.now()}`,
        ...newBookingData,
      };
      fallbackStore.bookings.unshift(fallbackBooking);
      createdBooking = fallbackBooking;
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: createdBooking.bookingId,
      booking: createdBooking,
    });
  } catch (error: any) {
    console.error('Booking Creation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process booking' },
      { status: 500 }
    );
  }
}
