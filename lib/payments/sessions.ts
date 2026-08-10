import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import Slot from '@/lib/models/Slot';
import PaymentSession from '@/lib/models/PaymentSession';
import { fallbackStore } from '@/lib/fallbackStore';
import { generateBookingId } from '@/lib/utils';
import {
  PAYMENT_STATUS,
  ACTIVE_SESSION_STATUSES,
  OCCUPYING_BOOKING_FILTER,
  bookingOccupiesSlot,
} from '@/lib/statuses';
import {
  IBooking,
  IPaymentSession,
  IPaymentSessionPublic,
  ITimelineEvent,
  PaymentStatus,
  VerificationMode,
} from '@/types';
import {
  TRANSACTION_ID_ERROR,
  TRANSACTION_LAST4_ERROR,
  isValidTransactionId,
  isValidTransactionLast4,
  normalizeTransactionRef,
} from '@/lib/validation';
import { getPaymentConfig, isPaymentConfigured, PaymentConfig } from './config';
import { buildUpiUri, generateQrDataUrl, generateSessionId, generateUpiReference } from './upi';
import {
  closeQrCode,
  createUpiQrCode,
  extractTransactionRef,
  fetchQrPayments,
  RazorpayPayment,
} from './razorpay';

export class PaymentFlowError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'payment_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function timelineEvent(title: string, actor = 'System', notes = ''): ITimelineEvent {
  return { title, timestamp: new Date().toISOString(), actor, notes };
}

function plain(doc: any): IPaymentSession | null {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...obj,
    _id: obj._id ? String(obj._id) : undefined,
    holdExpiresAt: new Date(obj.holdExpiresAt).toISOString(),
    paidAt: obj.paidAt ? new Date(obj.paidAt).toISOString() : null,
    verifiedAt: obj.verifiedAt ? new Date(obj.verifiedAt).toISOString() : null,
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : undefined,
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : undefined,
  } as IPaymentSession;
}

let indexPromise: Promise<void> | null = null;

/**
 * Builds the PaymentSession indexes explicitly rather than relying on Mongoose's
 * implicit autoIndex, which can be skipped silently. The unique partial index on
 * { date, slot } is what makes slot holds race-proof, so a failure to build it
 * must be loud.
 */
async function ensureIndexes(): Promise<void> {
  if (!indexPromise) {
    indexPromise = PaymentSession.createIndexes().catch((e) => {
      indexPromise = null;
      console.error(
        '[payments] FAILED to create PaymentSession indexes — concurrent holds are only guarded in application code:',
        e?.message || e
      );
    }) as Promise<void>;
  }
  return indexPromise;
}

async function useDb(): Promise<boolean> {
  const conn = await connectToDatabase();
  if (!conn) return false;
  await ensureIndexes();
  return true;
}

/* ------------------------------------------------------------------ *
 * Hold expiry
 * ------------------------------------------------------------------ */

/**
 * Releases every hold whose window has elapsed without a verified payment.
 * Called at the start of every read/write that depends on slot availability, so
 * abandoned checkouts free their slot without needing a background worker.
 */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();

  if (await useDb()) {
    try {
      const res = await PaymentSession.updateMany(
        {
          holdActive: true,
          status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUBMITTED] },
          holdExpiresAt: { $lt: now },
        },
        {
          $set: { holdActive: false, status: PAYMENT_STATUS.EXPIRED },
          $push: {
            timeline: {
              title: 'Payment window expired — slot released',
              timestamp: now,
              actor: 'System',
              notes: 'No verified payment was received before the hold expired.',
            },
          },
        }
      );
      return res.modifiedCount || 0;
    } catch (e) {
      console.warn('[payments] expiry sweep failed:', e);
      return 0;
    }
  }

  let count = 0;
  fallbackStore.paymentSessions.forEach((s) => {
    if (
      s.holdActive &&
      (s.status === PAYMENT_STATUS.PENDING || s.status === PAYMENT_STATUS.SUBMITTED) &&
      new Date(s.holdExpiresAt) < now
    ) {
      s.holdActive = false;
      s.status = PAYMENT_STATUS.EXPIRED;
      s.timeline = [...(s.timeline || []), timelineEvent('Payment window expired — slot released')];
      count++;
    }
  });
  return count;
}

/** Live holds for a date, used by the slot availability API. */
export async function getActiveHoldsForDate(date: string): Promise<IPaymentSession[]> {
  await releaseExpiredHolds();

  if (await useDb()) {
    try {
      const docs = await PaymentSession.find({ date, holdActive: true }).lean();
      return docs.map((d) => plain(d)!).filter(Boolean);
    } catch (e) {
      console.warn('[payments] hold lookup failed:', e);
      return [];
    }
  }

  return fallbackStore.paymentSessions.filter((s) => s.date === date && s.holdActive);
}

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export async function findSession(sessionId: string): Promise<IPaymentSession | null> {
  if (!sessionId) return null;

  if (await useDb()) {
    try {
      const doc = await PaymentSession.findOne({ sessionId }).lean();
      if (doc) return plain(doc);
    } catch (e) {
      console.warn('[payments] session lookup failed:', e);
    }
  }

  return fallbackStore.paymentSessions.find((s) => s.sessionId === sessionId) || null;
}

export async function listSessions(filter: {
  status?: string[];
  limit?: number;
} = {}): Promise<IPaymentSession[]> {
  await releaseExpiredHolds();
  const limit = filter.limit || 200;

  if (await useDb()) {
    try {
      const query: any = {};
      if (filter.status?.length) query.status = { $in: filter.status };
      const docs = await PaymentSession.find(query).sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((d) => plain(d)!).filter(Boolean);
    } catch (e) {
      console.warn('[payments] session list failed:', e);
    }
  }

  return fallbackStore.paymentSessions
    .filter((s) => !filter.status?.length || filter.status.includes(s.status))
    .slice(0, limit);
}

async function updateSession(
  sessionId: string,
  set: Record<string, any>,
  event?: ITimelineEvent,
  guard?: Record<string, any>
): Promise<IPaymentSession | null> {
  if (await useDb()) {
    try {
      const update: any = { $set: set };
      if (event) {
        update.$push = {
          timeline: { ...event, timestamp: new Date(event.timestamp) },
        };
      }
      const doc = await PaymentSession.findOneAndUpdate({ sessionId, ...(guard || {}) }, update, {
        new: true,
      }).lean();
      return plain(doc);
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new PaymentFlowError(
          'This Transaction ID has already been used for another booking.',
          409,
          'duplicate_transaction'
        );
      }
      console.warn('[payments] session update failed:', e);
      return null;
    }
  }

  const idx = fallbackStore.paymentSessions.findIndex((s) => s.sessionId === sessionId);
  if (idx === -1) return null;

  const current = fallbackStore.paymentSessions[idx];
  if (guard) {
    for (const [key, cond] of Object.entries(guard)) {
      const value = (current as any)[key];
      if (cond && typeof cond === 'object' && Array.isArray((cond as any).$in)) {
        if (!(cond as any).$in.includes(value)) return null;
      } else if (cond && typeof cond === 'object' && (cond as any).$ne !== undefined) {
        if (value === (cond as any).$ne) return null;
      } else if (value !== cond) {
        return null;
      }
    }
  }

  fallbackStore.paymentSessions[idx] = {
    ...current,
    ...set,
    timeline: event ? [...(current.timeline || []), event] : current.timeline,
  };
  return fallbackStore.paymentSessions[idx];
}

/* ------------------------------------------------------------------ *
 * Slot claiming
 * ------------------------------------------------------------------ */

async function assertSlotFree(date: string, slot: string, slotTime?: string) {
  const slotNames = [slot, slotTime].filter(Boolean) as string[];

  if (await useDb()) {
    try {
      const existing = await Booking.findOne({
        date,
        slot: { $in: slotNames },
        ...OCCUPYING_BOOKING_FILTER,
      }).lean();
      if (existing) {
        throw new PaymentFlowError(
          `Slot "${slot}" on ${date} has already been booked. Please pick another slot.`,
          409,
          'slot_taken'
        );
      }
      return;
    } catch (e) {
      if (e instanceof PaymentFlowError) throw e;
      console.warn('[payments] booking conflict check failed:', e);
    }
  }

  const existingFallback = fallbackStore.bookings.find(
    (b) => b.date === date && slotNames.includes(b.slot) && bookingOccupiesSlot(b.status)
  );
  if (existingFallback) {
    throw new PaymentFlowError(
      `Slot "${slot}" on ${date} has already been booked. Please pick another slot.`,
      409,
      'slot_taken'
    );
  }
}

/** Atomically takes the hold on a slot, or throws if somebody else holds it. */
async function claimSlot(record: IPaymentSession): Promise<IPaymentSession> {
  await releaseExpiredHolds();
  await assertSlotFree(record.date, record.slot, record.slotTime);

  if (await useDb()) {
    const { date, slot, holdActive, ...insertable } = record as any;
    try {
      const doc = await PaymentSession.findOneAndUpdate(
        { date: record.date, slot: record.slot, holdActive: true },
        {
          $setOnInsert: {
            ...insertable,
            holdExpiresAt: new Date(record.holdExpiresAt),
            timeline: (record.timeline || []).map((t) => ({
              ...t,
              timestamp: new Date(t.timestamp),
            })),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      const claimed = plain(doc);
      if (!claimed || claimed.sessionId !== record.sessionId) {
        throw new PaymentFlowError(
          'Someone else is currently paying for this slot. Please choose another slot or try again in a few minutes.',
          409,
          'slot_held'
        );
      }
      return claimed;
    } catch (e: any) {
      if (e instanceof PaymentFlowError) throw e;
      if (e?.code === 11000) {
        throw new PaymentFlowError(
          'Someone else is currently paying for this slot. Please choose another slot or try again in a few minutes.',
          409,
          'slot_held'
        );
      }
      console.warn('[payments] DB hold failed, falling back to memory store:', e);
    }
  }

  const held = fallbackStore.paymentSessions.find(
    (s) => s.date === record.date && s.slot === record.slot && s.holdActive
  );
  if (held) {
    throw new PaymentFlowError(
      'Someone else is currently paying for this slot. Please choose another slot or try again in a few minutes.',
      409,
      'slot_held'
    );
  }

  fallbackStore.paymentSessions.unshift(record);
  return record;
}

async function releaseHold(sessionId: string, status: PaymentStatus, reason: string, actor = 'System') {
  return updateSession(
    sessionId,
    { holdActive: false, status, failureReason: reason },
    timelineEvent(`Slot released — ${status}`, actor, reason)
  );
}

/* ------------------------------------------------------------------ *
 * Session creation
 * ------------------------------------------------------------------ */

export interface CreateSessionInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  packageId?: string;
  packageName: string;
  packagePrice: number;
  date: string;
  slot: string;
  slotTime?: string;
  clientIp?: string;
}

export async function createPaymentSession(
  input: CreateSessionInput
): Promise<{ session: IPaymentSession; config: PaymentConfig }> {
  const config = await getPaymentConfig();

  if (!isPaymentConfigured(config)) {
    throw new PaymentFlowError(
      'Online payment is not configured yet. Please contact MorExpert support to complete your booking.',
      503,
      'payment_not_configured'
    );
  }

  const amount = Number(input.packagePrice);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentFlowError('Selected package has an invalid price.', 400, 'invalid_amount');
  }

  const now = Date.now();
  const upiReference = generateUpiReference();
  const sessionId = generateSessionId();

  const record: IPaymentSession = {
    sessionId,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim().toLowerCase() || '',
    notes: input.notes?.trim() || '',
    packageId: input.packageId || '',
    packageName: input.packageName,
    packagePrice: amount,
    amount,
    date: input.date,
    slot: input.slot,
    slotTime: input.slotTime || '',
    status: PAYMENT_STATUS.PENDING,
    provider: config.provider,
    upiReference,
    holdActive: true,
    holdExpiresAt: new Date(now + config.holdMinutes * 60 * 1000).toISOString(),
    timeline: [
      timelineEvent(
        'Slot held for payment',
        'System',
        `Hold valid for ${config.holdMinutes} minutes. Booking is created only after payment verification.`
      ),
    ],
    createdAt: new Date(now).toISOString(),
  };

  const claimed = await claimSlot(record);

  // Gateway mode: mint a single-use, amount-locked UPI QR that we can verify server-side.
  if (config.razorpay) {
    try {
      const qr = await createUpiQrCode(config.razorpay, {
        amountInRupees: amount,
        description: `${input.packageName} — ${input.date} ${input.slot}`,
        reference: upiReference,
        closeBy: new Date(claimed.holdExpiresAt),
        name: input.name,
        phone: input.phone,
      });

      const updated = await updateSession(sessionId, {
        providerRefId: qr.id,
        providerQrImage: qr.image_url,
      });
      if (updated) return { session: updated, config };
    } catch (e) {
      console.warn('[payments] Razorpay QR creation failed, falling back to UPI QR:', e);
      const downgraded = await updateSession(
        sessionId,
        { provider: 'upi-manual' },
        timelineEvent(
          'Gateway unavailable',
          'System',
          'Falling back to UPI QR with manual verification.'
        )
      );
      if (downgraded) return { session: downgraded, config: { ...config, provider: 'upi-manual' } };
    }
  }

  return { session: claimed, config };
}

/* ------------------------------------------------------------------ *
 * Public projection (what the browser is allowed to see)
 * ------------------------------------------------------------------ */

export async function toPublicSession(
  session: IPaymentSession,
  config?: PaymentConfig
): Promise<IPaymentSessionPublic> {
  const cfg = config || (await getPaymentConfig());
  const secondsRemaining = Math.max(
    0,
    Math.floor((new Date(session.holdExpiresAt).getTime() - Date.now()) / 1000)
  );

  let qrImage: string | undefined;
  let qrIsStatic = false;
  let upiLink: string | undefined;

  const isLive =
    session.status === PAYMENT_STATUS.PENDING || session.status === PAYMENT_STATUS.SUBMITTED;

  if (isLive) {
    if (session.provider === 'razorpay' && session.providerQrImage) {
      qrImage = session.providerQrImage;
    } else if (cfg.upiId) {
      upiLink = buildUpiUri({
        upiId: cfg.upiId,
        payeeName: cfg.payeeName,
        amount: session.amount,
        note: `MorExpert ${session.upiReference}`,
        reference: session.upiReference,
      });
      qrImage = await generateQrDataUrl(upiLink);
    } else if (cfg.staticQrImageUrl) {
      qrImage = cfg.staticQrImageUrl;
      qrIsStatic = true;
    }
  }

  let booking: IBooking | null = null;
  if (session.bookingId) {
    booking = await findBookingByBookingId(session.bookingId);
  }

  return {
    sessionId: session.sessionId,
    status: session.status,
    provider: session.provider,
    amount: session.amount,
    packageName: session.packageName,
    date: session.date,
    slot: session.slot,
    name: session.name,
    phone: session.phone,
    upiReference: session.upiReference,
    upiId: isLive ? cfg.upiId || undefined : undefined,
    payeeName: isLive ? cfg.payeeName : undefined,
    upiLink,
    qrImage,
    qrIsStatic,
    holdExpiresAt: session.holdExpiresAt,
    secondsRemaining,
    requiresManualSubmission: session.provider !== 'razorpay',
    transactionRef: session.transactionRef,
    transactionRefLast4: session.transactionRefLast4 || undefined,
    failureReason: session.failureReason,
    bookingId: session.bookingId,
    booking,
  };
}

async function findBookingByBookingId(bookingId: string): Promise<IBooking | null> {
  if (await useDb()) {
    try {
      const doc = await Booking.findOne({ bookingId }).lean();
      if (doc) return JSON.parse(JSON.stringify(doc)) as IBooking;
    } catch (e) {
      console.warn('[payments] booking lookup failed:', e);
    }
  }
  return fallbackStore.bookings.find((b) => b.bookingId === bookingId) || null;
}

/* ------------------------------------------------------------------ *
 * Gateway synchronisation (the automatic verification path)
 * ------------------------------------------------------------------ */

/**
 * Asks Razorpay whether the QR attached to this session was actually credited.
 * Nothing the browser sends can influence the outcome.
 */
export async function syncGatewayPayment(session: IPaymentSession): Promise<IPaymentSession> {
  const config = await getPaymentConfig();
  if (
    !config.razorpay ||
    session.provider !== 'razorpay' ||
    !session.providerRefId ||
    session.status === PAYMENT_STATUS.CONFIRMED ||
    session.status === PAYMENT_STATUS.VERIFIED
  ) {
    return session;
  }

  let payments: RazorpayPayment[] = [];
  try {
    payments = await fetchQrPayments(config.razorpay, session.providerRefId);
  } catch (e) {
    console.warn('[payments] gateway sync failed:', (e as Error).message);
    return session;
  }

  const expectedPaise = Math.round(session.amount * 100);
  const captured = payments.find(
    (p) => p.status === 'captured' && Number(p.amount) >= expectedPaise
  );
  if (!captured) return session;

  const confirmed = await confirmSessionPayment(session.sessionId, {
    transactionRef: extractTransactionRef(captured),
    providerPaymentId: captured.id,
    amountPaid: Number(captured.amount) / 100,
    paidAt: captured.created_at ? new Date(captured.created_at * 1000) : new Date(),
    verifiedBy: 'Razorpay',
    verificationMode: 'gateway',
  });

  return confirmed.session;
}

/* ------------------------------------------------------------------ *
 * Manual submission (static / dynamic UPI QR without a gateway)
 * ------------------------------------------------------------------ */

async function transactionRefAlreadyUsed(ref: string, exceptSessionId: string): Promise<boolean> {
  if (await useDb()) {
    try {
      const [session, booking] = await Promise.all([
        PaymentSession.findOne({ transactionRef: ref, sessionId: { $ne: exceptSessionId } }).lean(),
        Booking.findOne({ transactionRef: ref }).lean(),
      ]);
      return Boolean(session || booking);
    } catch (e) {
      console.warn('[payments] duplicate reference check failed:', e);
    }
  }

  return (
    fallbackStore.paymentSessions.some(
      (s) => s.transactionRef === ref && s.sessionId !== exceptSessionId
    ) || fallbackStore.bookings.some((b) => b.transactionRef === ref)
  );
}

/**
 * The customer confirms their UPI payment by giving us the transaction id from
 * their payment app — either the complete reference, or just its last 4
 * characters. Submitting it confirms the booking and locks the slot.
 *
 * Only a *complete* reference is checked for reuse. Last-4 is not: with 10,000
 * possible values, two unrelated customers sharing one is ordinary rather than
 * suspicious, so rejecting on it would lock out legitimate bookings. That makes
 * last-4 the weaker of the two — the admin reconciles it against the UPI
 * statement, exactly as they did with screenshots.
 */
export async function submitTransactionReference(
  sessionId: string,
  input: { transactionId?: string; transactionLast4?: string }
): Promise<{ session: IPaymentSession; booking: IBooking }> {
  const session = await findSession(sessionId);
  if (!session) throw new PaymentFlowError('Payment session not found.', 404, 'not_found');

  // Already confirmed (double submit / retried request) — hand back the same booking.
  if (session.status === PAYMENT_STATUS.CONFIRMED && session.bookingId) {
    const booking = await findBookingByBookingId(session.bookingId);
    if (booking) return { session, booking };
  }

  if (session.status !== PAYMENT_STATUS.PENDING && session.status !== PAYMENT_STATUS.SUBMITTED) {
    throw new PaymentFlowError(
      `This payment session is no longer active (${session.status}). Please start a new booking.`,
      409,
      'session_closed'
    );
  }
  if (new Date(session.holdExpiresAt) < new Date()) {
    await releaseHold(
      sessionId,
      PAYMENT_STATUS.EXPIRED,
      'Hold expired before the transaction details were submitted.'
    );
    throw new PaymentFlowError(
      'Your payment window expired and the slot was released. Please start again.',
      410,
      'expired'
    );
  }

  const fullRef = normalizeTransactionRef(input.transactionId);
  const last4 = normalizeTransactionRef(input.transactionLast4);

  if (!fullRef && !last4) {
    throw new PaymentFlowError(
      'Enter your Transaction ID, or the last 4 digits of it, to confirm your payment.',
      400,
      'transaction_required'
    );
  }
  if (fullRef && !isValidTransactionId(fullRef)) {
    throw new PaymentFlowError(TRANSACTION_ID_ERROR, 400, 'invalid_transaction_id');
  }
  if (!fullRef && !isValidTransactionLast4(last4)) {
    throw new PaymentFlowError(TRANSACTION_LAST4_ERROR, 400, 'invalid_transaction_last4');
  }

  if (fullRef && (await transactionRefAlreadyUsed(fullRef, sessionId))) {
    throw new PaymentFlowError(
      'This Transaction ID has already been used for another booking. Check the reference in your UPI app.',
      409,
      'duplicate_transaction'
    );
  }

  // Record what the customer gave us first, so the booking created below carries it.
  const withRef = await updateSession(
    sessionId,
    fullRef ? { transactionRef: fullRef } : { transactionRefLast4: last4 },
    timelineEvent(
      'Transaction details submitted',
      session.name,
      fullRef ? `Transaction ID ${fullRef}` : `Last 4 digits of Transaction ID: ${last4}`
    ),
    { status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUBMITTED] } }
  );

  if (!withRef) {
    throw new PaymentFlowError('Payment session could not be updated.', 409, 'session_closed');
  }

  return confirmSessionPayment(sessionId, {
    ...(fullRef ? { transactionRef: fullRef } : {}),
    amountPaid: withRef.amount,
    paidAt: new Date(),
    verifiedBy: withRef.name,
    verificationMode: 'transaction-id',
    notes: fullRef
      ? `Confirmed on the customer's Transaction ID (${fullRef}).`
      : `Confirmed on the last 4 digits of the customer's Transaction ID (${last4}).`,
  });
}

/* ------------------------------------------------------------------ *
 * Confirmation — the ONLY place a Booking is created
 * ------------------------------------------------------------------ */

export interface VerificationInput {
  transactionRef?: string;
  providerPaymentId?: string;
  amountPaid?: number | null;
  paidAt?: Date;
  verifiedBy: string;
  verificationMode: VerificationMode;
  notes?: string;
}

export async function confirmSessionPayment(
  sessionId: string,
  verification: VerificationInput
): Promise<{ session: IPaymentSession; booking: IBooking }> {
  const existing = await findSession(sessionId);
  if (!existing) throw new PaymentFlowError('Payment session not found.', 404, 'not_found');

  // Idempotency: a webhook, a poll and an admin click can all land at once.
  if (existing.status === PAYMENT_STATUS.CONFIRMED && existing.bookingId) {
    const booking = await findBookingByBookingId(existing.bookingId);
    if (booking) return { session: existing, booking };
  }

  const ref = (verification.transactionRef || existing.transactionRef || '').trim().toUpperCase();
  if (ref && (await transactionRefAlreadyUsed(ref, sessionId))) {
    throw new PaymentFlowError(
      'This transaction reference has already been used for another booking.',
      409,
      'duplicate_transaction'
    );
  }

  const verifiedAt = new Date();
  const claimed = await updateSession(
    sessionId,
    {
      status: PAYMENT_STATUS.VERIFIED,
      ...(ref ? { transactionRef: ref } : {}),
      ...(verification.providerPaymentId
        ? { providerPaymentId: verification.providerPaymentId }
        : {}),
      amountPaid:
        verification.amountPaid !== undefined && verification.amountPaid !== null
          ? Number(verification.amountPaid)
          : existing.amount,
      paidAt: verification.paidAt || verifiedAt,
      verifiedAt,
      verifiedBy: verification.verifiedBy,
      verificationMode: verification.verificationMode,
      holdActive: true,
    },
    timelineEvent(
      'Payment verified',
      verification.verifiedBy,
      verification.notes ||
        `Verified via ${verification.verificationMode}${ref ? ` (ref ${ref})` : ''}.`
    ),
    { status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUBMITTED] } }
  );

  if (!claimed) {
    // Somebody else already flipped it — return their result rather than double-booking.
    const current = await findSession(sessionId);
    if (current?.bookingId) {
      const booking = await findBookingByBookingId(current.bookingId);
      if (booking) return { session: current, booking };
    }
    throw new PaymentFlowError(
      `This payment session can no longer be verified (current status: ${current?.status || 'unknown'}).`,
      409,
      'session_closed'
    );
  }

  // Defensive: never create a second booking on an occupied slot.
  try {
    await assertSlotFree(claimed.date, claimed.slot, claimed.slotTime);
  } catch (e) {
    await updateSession(
      sessionId,
      { status: PAYMENT_STATUS.FAILED, holdActive: false, failureReason: (e as Error).message },
      timelineEvent(
        'Verification blocked — slot already booked',
        verification.verifiedBy,
        'A refund is required for this payment.'
      )
    );
    throw new PaymentFlowError(
      'The slot was already booked by another customer. This payment must be refunded.',
      409,
      'slot_taken'
    );
  }

  const booking = await createBookingFromSession(claimed);

  const confirmed = await updateSession(
    sessionId,
    {
      status: PAYMENT_STATUS.CONFIRMED,
      bookingId: booking.bookingId,
      holdActive: false,
    },
    timelineEvent(
      'Booking confirmed',
      verification.verifiedBy,
      `Booking ${booking.bookingId} created and slot locked.`
    )
  );

  // A single-use gateway QR is closed so it can never be paid twice.
  const config = await getPaymentConfig();
  if (config.razorpay && claimed.provider === 'razorpay' && claimed.providerRefId) {
    await closeQrCode(config.razorpay, claimed.providerRefId);
  }

  return { session: confirmed || claimed, booking };
}

async function createBookingFromSession(session: IPaymentSession): Promise<IBooking> {
  const bookingId = generateBookingId();
  const nowIso = new Date().toISOString();

  const data: IBooking = {
    bookingId,
    name: session.name,
    email: session.email || '',
    phone: session.phone,
    resume: '',
    notes: session.notes || '',
    date: session.date,
    slot: session.slot,
    status: 'Booking Confirmed',
    price: session.amount,
    packageName: session.packageName,
    packagePrice: session.packagePrice,
    bookingSource: 'User',
    remarks:
      session.verificationMode === 'transaction-id'
        ? `Confirmed on the transaction details supplied by the customer${
            session.transactionRef
              ? ` (Transaction ID ${session.transactionRef}).`
              : session.transactionRefLast4
              ? ` (Transaction ID ending ${session.transactionRefLast4}).`
              : '.'
          }`
        : `Paid online — verified via ${session.verificationMode || 'payment'}.`,
    otpVerified: false,
    paymentStatus: PAYMENT_STATUS.VERIFIED,
    paymentSessionId: session.sessionId,
    paymentProvider: session.provider,
    transactionRef: session.transactionRef || '',
    transactionRefLast4: session.transactionRefLast4 || '',
    providerPaymentId: session.providerPaymentId || '',
    amountPaid: session.amountPaid ?? session.amount,
    paidAt: session.paidAt || nowIso,
    paymentVerifiedAt: session.verifiedAt || nowIso,
    paymentVerifiedBy: session.verifiedBy || 'System',
    verificationMode: session.verificationMode as any,
    paymentProofUrl: session.paymentProofUrl || '',
    upiReference: session.upiReference,
    createdAt: nowIso,
    timeline: [
      {
        title: 'Booking confirmed',
        timestamp: nowIso,
        actor: session.verifiedBy || 'System',
        notes: session.transactionRef
          ? `Transaction ID ${session.transactionRef}`
          : session.transactionRefLast4
          ? `Transaction ID ending ${session.transactionRefLast4}`
          : '',
      },
    ],
  };

  if (await useDb()) {
    try {
      const created = await Booking.create(data as any);
      try {
        await Slot.findOneAndUpdate(
          { date: session.date, time: session.slotTime || session.slot },
          { $inc: { booked: 1 } },
          { upsert: true }
        );
      } catch (e) {
        console.warn('[payments] slot counter update failed:', e);
      }
      return JSON.parse(JSON.stringify(created.toObject())) as IBooking;
    } catch (e) {
      console.warn('[payments] booking insert failed, using fallback store:', e);
    }
  }

  const fallbackBooking: IBooking = { _id: `b-${Date.now()}`, ...data };
  fallbackStore.bookings.unshift(fallbackBooking);
  return fallbackBooking;
}

/* ------------------------------------------------------------------ *
 * Failure paths
 * ------------------------------------------------------------------ */

export async function cancelSession(sessionId: string, actor = 'Customer'): Promise<IPaymentSession | null> {
  const session = await findSession(sessionId);
  if (!session) return null;
  if (session.status === PAYMENT_STATUS.CONFIRMED) {
    throw new PaymentFlowError('This booking is already confirmed and cannot be cancelled here.', 409, 'already_confirmed');
  }

  const config = await getPaymentConfig();
  if (config.razorpay && session.provider === 'razorpay' && session.providerRefId) {
    await closeQrCode(config.razorpay, session.providerRefId);
  }

  return updateSession(
    sessionId,
    { status: PAYMENT_STATUS.CANCELLED, holdActive: false, failureReason: 'Cancelled before payment.' },
    timelineEvent('Payment cancelled — slot released', actor)
  );
}

export async function failSession(
  sessionId: string,
  reason: string,
  actor = 'System'
): Promise<IPaymentSession | null> {
  const session = await findSession(sessionId);
  if (!session) return null;
  if (session.status === PAYMENT_STATUS.CONFIRMED) {
    throw new PaymentFlowError('This booking is already confirmed.', 409, 'already_confirmed');
  }
  return releaseHold(sessionId, PAYMENT_STATUS.FAILED, reason, actor);
}

export { ACTIVE_SESSION_STATUSES, PAYMENT_STATUS };
