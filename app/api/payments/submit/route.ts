import { NextResponse } from 'next/server';
import { saveUploadedFile } from '@/lib/uploads';
import { PaymentFlowError, submitPaymentProof, toPublicSession } from '@/lib/payments/sessions';

export const dynamic = 'force-dynamic';

/**
 * The customer uploads the screenshot of their completed UPI payment.
 * A successful upload confirms the booking immediately — the slot is locked,
 * the booking is written to MongoDB and the confirmed details come straight back.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Upload the payment screenshot as multipart/form-data.' },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const sessionId = (form.get('sessionId') as string) || '';
    const proof = form.get('paymentProof') as File | null;

    if (!sessionId) {
      return NextResponse.json({ error: 'Payment session is required.' }, { status: 400 });
    }
    if (!proof || typeof proof !== 'object' || !proof.name) {
      return NextResponse.json(
        { error: 'Upload a screenshot of your completed payment to continue.', code: 'proof_required' },
        { status: 400 }
      );
    }

    const saved = await saveUploadedFile(proof, { prefix: 'payment' });
    if (!saved) {
      return NextResponse.json(
        { error: 'The screenshot could not be read. Please try another image.' },
        { status: 400 }
      );
    }

    const { session, booking } = await submitPaymentProof(sessionId, {
      proofUrl: saved.url,
      proofHash: saved.hash,
    });

    return NextResponse.json({
      success: true,
      message: `Payment screenshot received. Booking ${booking.bookingId} is confirmed and your slot is locked.`,
      data: await toPublicSession(session),
      booking,
    });
  } catch (error: any) {
    if (error instanceof PaymentFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[payments] screenshot submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Could not submit the payment screenshot.' },
      { status: 500 }
    );
  }
}
