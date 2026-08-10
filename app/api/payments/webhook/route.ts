import { NextResponse } from 'next/server';
import PaymentSession from '@/lib/models/PaymentSession';
import connectToDatabase from '@/lib/mongodb';
import { fallbackStore } from '@/lib/fallbackStore';
import { getRazorpayCredentials } from '@/lib/payments/config';
import { extractTransactionRef, verifyWebhookSignature } from '@/lib/payments/razorpay';
import { confirmSessionPayment, PaymentFlowError } from '@/lib/payments/sessions';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook. The raw body is HMAC-verified against RAZORPAY_WEBHOOK_SECRET
 * before anything is trusted, so an attacker cannot forge a "paid" callback.
 *
 * Configure in the Razorpay dashboard:
 *   URL:    https://<your-domain>/api/payments/webhook
 *   Events: qr_code.credited, payment.captured
 */
export async function POST(req: Request) {
  const creds = getRazorpayCredentials();
  if (!creds || !creds.webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  if (!verifyWebhookSignature(rawBody, signature, creds.webhookSecret)) {
    console.warn('[payments] rejected webhook with invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const payment = event?.payload?.payment?.entity;
    const qrCode = event?.payload?.qr_code?.entity;

    if (!payment || payment.status !== 'captured') {
      return NextResponse.json({ success: true, ignored: true });
    }

    const qrId: string = qrCode?.id || payment?.description_qr_id || '';
    const reference: string = payment?.notes?.reference || qrCode?.notes?.reference || '';

    const session = await findSessionByGatewayRef(qrId, reference);
    if (!session) {
      console.warn('[payments] webhook could not be matched to a session', { qrId, reference });
      return NextResponse.json({ success: true, matched: false });
    }

    const expectedPaise = Math.round(Number(session.amount) * 100);
    if (Number(payment.amount) < expectedPaise) {
      console.warn('[payments] webhook amount below expected, ignoring', {
        got: payment.amount,
        expected: expectedPaise,
      });
      return NextResponse.json({ success: true, ignored: true, reason: 'amount_mismatch' });
    }

    await confirmSessionPayment(session.sessionId, {
      transactionRef: extractTransactionRef(payment),
      providerPaymentId: payment.id,
      amountPaid: Number(payment.amount) / 100,
      paidAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
      verifiedBy: 'Razorpay Webhook',
      verificationMode: 'webhook',
      notes: `Webhook event ${event.event}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof PaymentFlowError) {
      // Already confirmed / no longer verifiable — acknowledge so Razorpay stops retrying.
      console.warn('[payments] webhook flow notice:', error.message);
      return NextResponse.json({ success: true, notice: error.code });
    }
    console.error('[payments] webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function findSessionByGatewayRef(qrId: string, reference: string) {
  const conn = await connectToDatabase();

  if (conn) {
    try {
      const query: any = { $or: [] as any[] };
      if (qrId) query.$or.push({ providerRefId: qrId });
      if (reference) query.$or.push({ upiReference: reference });
      if (query.$or.length) {
        const doc = await PaymentSession.findOne(query).sort({ createdAt: -1 }).lean();
        if (doc) return doc as any;
      }
    } catch (e) {
      console.warn('[payments] webhook session lookup failed:', e);
    }
  }

  return (
    fallbackStore.paymentSessions.find(
      (s) => (qrId && s.providerRefId === qrId) || (reference && s.upiReference === reference)
    ) || null
  );
}
