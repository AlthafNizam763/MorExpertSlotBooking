import { NextResponse } from 'next/server';
import {
  cancelSession,
  findSession,
  PaymentFlowError,
  releaseExpiredHolds,
  syncGatewayPayment,
  toPublicSession,
} from '@/lib/payments/sessions';

export const dynamic = 'force-dynamic';

/**
 * Status poll. On every call the server re-checks the gateway itself, so the
 * confirmation can never be driven by what the browser claims.
 */
export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    await releaseExpiredHolds();

    let session = await findSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Payment session not found.' }, { status: 404 });
    }

    try {
      session = await syncGatewayPayment(session);
    } catch (e) {
      if (!(e instanceof PaymentFlowError)) throw e;
      console.warn('[payments] gateway confirmation issue:', e.message);
    }

    return NextResponse.json({ success: true, data: await toPublicSession(session) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/** Customer abandoned the payment — release the hold immediately. */
export async function DELETE(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const session = await cancelSession(sessionId, 'Customer');
    if (!session) {
      return NextResponse.json({ error: 'Payment session not found.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Payment cancelled and slot released.',
      data: await toPublicSession(session),
    });
  } catch (error: any) {
    if (error instanceof PaymentFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
