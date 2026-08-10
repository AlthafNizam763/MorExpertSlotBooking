import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { listSessions, releaseExpiredHolds } from '@/lib/payments/sessions';
import { getPaymentConfig } from '@/lib/payments/config';
import { PAYMENT_STATUS } from '@/lib/statuses';

export const dynamic = 'force-dynamic';

/**
 * Read-only payment log for the admin panel. Bookings confirm themselves when the
 * customer submits their transaction details, so there is nothing to action here —
 * this exists so an admin can reconcile those references and the payment history.
 */
export async function GET(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    await releaseExpiredHolds();

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'all';

    const status =
      scope === 'confirmed'
        ? [PAYMENT_STATUS.CONFIRMED]
        : scope === 'active'
        ? [PAYMENT_STATUS.PENDING]
        : undefined;

    const sessions = await listSessions({ status, limit: 300 });
    const config = await getPaymentConfig();

    return NextResponse.json({
      success: true,
      data: sessions,
      confirmedCount: sessions.filter((s) => s.status === PAYMENT_STATUS.CONFIRMED).length,
      config: {
        provider: config.provider,
        upiId: config.upiId,
        payeeName: config.payeeName,
        holdMinutes: config.holdMinutes,
        hasStaticQr: Boolean(config.staticQrImageUrl),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
