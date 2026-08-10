import crypto from 'crypto';
import { RazorpayCredentials } from './config';

/**
 * Minimal Razorpay REST client. Used only when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 * are configured — it creates a *dynamic* UPI QR code (amount locked, single use)
 * and lets the server confirm, against Razorpay, that money actually arrived.
 * No client-side SDK is involved, so nothing the browser sends can fake a payment.
 */

const API_BASE = 'https://api.razorpay.com/v1';

function authHeader(creds: RazorpayCredentials): string {
  return `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}`;
}

async function request<T = any>(
  creds: RazorpayCredentials,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(creds),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Razorpay returned a non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(json?.error?.description || `Razorpay request failed (${res.status})`);
  }
  return json as T;
}

export interface RazorpayQrCode {
  id: string;
  image_url: string;
  status: string;
  payment_amount?: number;
  close_by?: number;
}

/** Creates a single-use, amount-locked UPI QR code. */
export async function createUpiQrCode(
  creds: RazorpayCredentials,
  opts: { amountInRupees: number; description: string; reference: string; closeBy: Date; name: string; phone: string }
): Promise<RazorpayQrCode> {
  const body = {
    type: 'upi_qr',
    name: opts.name.slice(0, 40),
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: Math.round(opts.amountInRupees * 100),
    description: opts.description.slice(0, 100),
    // Razorpay requires close_by to be at least 15 minutes in the future.
    close_by: Math.floor(Math.max(opts.closeBy.getTime(), Date.now() + 16 * 60 * 1000) / 1000),
    notes: { reference: opts.reference, phone: opts.phone },
  };

  return request<RazorpayQrCode>(creds, '/payments/qr_codes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface RazorpayPayment {
  id: string;
  amount: number;
  status: string;
  method?: string;
  acquirer_data?: { rrn?: string; upi_transaction_id?: string };
  created_at?: number;
  vpa?: string;
}

/** Server-side truth check: has this QR actually been credited? */
export async function fetchQrPayments(
  creds: RazorpayCredentials,
  qrCodeId: string
): Promise<RazorpayPayment[]> {
  const json = await request<{ items: RazorpayPayment[] }>(
    creds,
    `/payments/qr_codes/${encodeURIComponent(qrCodeId)}/payments?count=10`
  );
  return json.items || [];
}

export async function fetchPayment(
  creds: RazorpayCredentials,
  paymentId: string
): Promise<RazorpayPayment> {
  return request<RazorpayPayment>(creds, `/payments/${encodeURIComponent(paymentId)}`);
}

export async function closeQrCode(creds: RazorpayCredentials, qrCodeId: string): Promise<void> {
  try {
    await request(creds, `/payments/qr_codes/${encodeURIComponent(qrCodeId)}/close`, {
      method: 'POST',
    });
  } catch (e) {
    console.warn('[razorpay] failed to close QR code:', (e as Error).message);
  }
}

/** Constant-time webhook signature check. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function extractTransactionRef(payment: RazorpayPayment): string {
  return (
    payment.acquirer_data?.rrn ||
    payment.acquirer_data?.upi_transaction_id ||
    payment.id ||
    ''
  );
}
