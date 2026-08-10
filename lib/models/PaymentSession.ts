import mongoose, { Schema, Document, Model } from 'mongoose';
import { PAYMENT_STATUS } from '@/lib/statuses';

/**
 * A PaymentSession is the temporary hold placed on a slot while the customer pays.
 * It is NOT a booking. A Booking document is only created once the payment attached
 * to this session has been verified (gateway, webhook, or admin verification).
 *
 * The unique partial index on { date, slot } where holdActive = true is what makes
 * the hold atomic: two customers racing for the same slot cannot both hold it.
 */
export interface IPaymentSessionDocument extends Document {
  sessionId: string;
  bookingId?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  packageId?: string;
  packageName: string;
  packagePrice: number;
  amount: number;
  date: string;
  slot: string;
  slotTime?: string;
  status: string;
  provider: string;
  providerRefId?: string;
  providerQrImage?: string;
  providerPaymentId?: string;
  transactionRef?: string;
  paymentProofUrl?: string;
  proofHash?: string;
  amountPaid?: number | null;
  paidAt?: Date | null;
  verifiedAt?: Date | null;
  verifiedBy?: string;
  verificationMode?: string;
  failureReason?: string;
  upiReference: string;
  holdActive: boolean;
  holdExpiresAt: Date;
  clientIp?: string;
  timeline: Array<{ title: string; timestamp: Date; actor: string; notes?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const TimelineEventSchema = new Schema(
  {
    title: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, default: 'System' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const PaymentSessionSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, default: '' },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: '' },
    notes: { type: String, default: '' },
    packageId: { type: String, default: '' },
    packageName: { type: String, default: 'Standard Package' },
    packagePrice: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    date: { type: String, required: true, index: true },
    slot: { type: String, required: true },
    slotTime: { type: String, default: '' },
    status: { type: String, default: PAYMENT_STATUS.PENDING, index: true },
    provider: { type: String, default: 'upi-manual' },
    providerRefId: { type: String, default: '' },
    providerQrImage: { type: String, default: '' },
    providerPaymentId: { type: String, default: '' },
    // Gateway-only. Customers never type a reference — the payment screenshot is
    // the sole proof they submit. No default keeps the partial index below free
    // of empty-string collisions.
    transactionRef: { type: String },
    paymentProofUrl: { type: String, default: '' },
    // SHA-256 of the uploaded screenshot; also absent until a proof is uploaded.
    proofHash: { type: String },
    amountPaid: { type: Number, default: null },
    paidAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: '' },
    verificationMode: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    upiReference: { type: String, required: true, index: true },
    holdActive: { type: Boolean, default: true },
    holdExpiresAt: { type: Date, required: true, index: true },
    clientIp: { type: String, default: '' },
    timeline: { type: [TimelineEventSchema], default: [] },
  },
  { timestamps: true }
);

// Atomic slot hold: at most one live hold per (date, slot).
PaymentSessionSchema.index(
  { date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { holdActive: true } }
);

// A gateway reference may only ever be claimed once across all sessions.
PaymentSessionSchema.index(
  { transactionRef: 1 },
  { unique: true, partialFilterExpression: { transactionRef: { $type: 'string' } } }
);

// The same screenshot cannot be submitted for two different bookings.
PaymentSessionSchema.index(
  { proofHash: 1 },
  { unique: true, partialFilterExpression: { proofHash: { $type: 'string' } } }
);

// Drop any model compiled from an older revision of this schema (dev hot reload),
// otherwise newly added fields are silently stripped on save.
if (mongoose.models && mongoose.models.PaymentSession) {
  delete (mongoose.models as any).PaymentSession;
}

export const PaymentSession: Model<IPaymentSessionDocument> =
  (mongoose.models.PaymentSession as Model<IPaymentSessionDocument>) ||
  mongoose.model<IPaymentSessionDocument>('PaymentSession', PaymentSessionSchema);

export default PaymentSession;
