import { NextResponse } from 'next/server';
import { PaymentFlowError, submitTransactionReference, toPublicSession } from '@/lib/payments/sessions';

export const dynamic = 'force-dynamic';

/**
 * The customer submits the transaction details of their completed UPI payment —
 * either the complete Transaction ID, or just its last 4 digits. Submitting
 * confirms the booking immediately: the slot is locked, the booking is written
 * to MongoDB and the confirmed details come straight back.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Accepts JSON, but a form post is read too rather than rejected outright —
    // there is no file involved either way.
    let sessionId = '';
    let transactionId = '';
    let transactionLast4 = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      sessionId = String(body.sessionId || '');
      transactionId = String(body.transactionId || '');
      transactionLast4 = String(body.transactionLast4 || '');
    } else {
      const form = await req.formData();
      sessionId = String(form.get('sessionId') || '');
      transactionId = String(form.get('transactionId') || '');
      transactionLast4 = String(form.get('transactionLast4') || '');
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Payment session is required.' }, { status: 400 });
    }

    const { session, booking } = await submitTransactionReference(sessionId, {
      transactionId,
      transactionLast4,
    });

    return NextResponse.json({
      success: true,
      message: `Transaction details received. Booking ${booking.bookingId} is confirmed and your slot is locked.`,
      data: await toPublicSession(session),
      booking,
    });
  } catch (error: any) {
    if (error instanceof PaymentFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[payments] transaction submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Could not submit your transaction details.' },
      { status: 500 }
    );
  }
}
