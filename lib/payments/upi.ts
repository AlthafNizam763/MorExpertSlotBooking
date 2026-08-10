import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Builds a NPCI UPI intent URI. Because the amount (am) and transaction
 * reference (tr) are baked into the QR, the customer cannot silently pay a
 * different amount, and the reference lets us match the credit back to a session.
 */
export function buildUpiUri(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
  reference: string;
}): string {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName,
    am: Number(opts.amount).toFixed(2),
    cu: 'INR',
    tn: opts.note.slice(0, 50),
    tr: opts.reference,
  });
  return `upi://pay?${params.toString()}`;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 420,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

/** Short, human-quotable reference the customer can put in the payment note. */
export function generateUpiReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'MXP';
  const bytes = crypto.randomBytes(7);
  for (let i = 0; i < 7; i++) {
    ref += chars[bytes[i] % chars.length];
  }
  return ref;
}

export function generateSessionId(): string {
  return `PS-${crypto.randomBytes(12).toString('hex')}`;
}
