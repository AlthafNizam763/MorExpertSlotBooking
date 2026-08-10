import connectToDatabase from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { fallbackStore } from '@/lib/fallbackStore';
import { PaymentProvider } from '@/types';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface PaymentConfig {
  /** 'razorpay' = payment is verified automatically against the gateway.
   *  'upi-manual' = static/dynamic UPI QR, verified by an admin against the bank statement. */
  provider: PaymentProvider;
  razorpay: RazorpayCredentials | null;
  upiId: string;
  payeeName: string;
  /** Admin-uploaded static QR image, used when no UPI id is configured. */
  staticQrImageUrl: string;
  holdMinutes: number;
}

const DEFAULT_UPI_ID = process.env.UPI_ID || '';
const DEFAULT_PAYEE_NAME = process.env.UPI_PAYEE_NAME || 'MorExpert';

export function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  };
}

function clampMinutes(value: any, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  let settings: any = null;

  const conn = await connectToDatabase();
  if (conn) {
    try {
      settings = await Settings.findOne().lean();
    } catch (e) {
      console.warn('[payments] settings lookup failed, using fallback store:', e);
    }
  }
  if (!settings) settings = fallbackStore.settings;

  const razorpay = getRazorpayCredentials();

  return {
    provider: razorpay ? 'razorpay' : 'upi-manual',
    razorpay,
    upiId: (settings?.upiId || DEFAULT_UPI_ID || '').trim(),
    payeeName: (settings?.upiPayeeName || DEFAULT_PAYEE_NAME).trim(),
    staticQrImageUrl: settings?.upiQrImageUrl || '',
    holdMinutes: clampMinutes(settings?.holdMinutes, 10, 2, 60),
  };
}

/** True when the site is able to collect a payment at all. */
export function isPaymentConfigured(config: PaymentConfig): boolean {
  return Boolean(config.razorpay || config.upiId || config.staticQrImageUrl);
}
