export type BookingStatus =
  | 'Draft'
  | 'OTP Verified'
  | 'Pending Admin Approval'
  | 'Approved'
  | 'Rejected'
  | 'Rescheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Pending'
  | 'Price Assigned'
  | 'Confirmed'
  | 'Booking Confirmed'
  | 'Resume Under Review';

export type PaymentStatus =
  | 'Payment Pending'
  | 'Payment Submitted'
  | 'Payment Verified'
  | 'Payment Failed'
  | 'Payment Expired'
  | 'Payment Cancelled'
  | 'Booking Confirmed';

export type PaymentProvider = 'razorpay' | 'upi-manual';

/**
 * How a payment came to be trusted. 'screenshot' is retained only so bookings
 * confirmed before the transaction-id flow replaced it still read back correctly.
 */
export type VerificationMode =
  | 'gateway'
  | 'webhook'
  | 'admin'
  | 'transaction-id'
  | 'screenshot';

export type AdminRole = 'super_admin' | 'staff_admin' | 'admin';

export interface ITimelineEvent {
  title: string;
  timestamp: string;
  actor: string;
  notes?: string;
}

export interface IBooking {
  _id?: string;
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  resume: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  slot: string; // e.g. "09:00 AM", "11:00 AM", "03:00 PM"
  status: BookingStatus;
  price?: number | null;
  packageName?: string;
  packagePrice?: number | null;
  remarks?: string;
  privateNotes?: string;
  publicNotes?: string;
  rejectionReason?: string;
  rescheduledFrom?: { date: string; slot: string };
  rescheduledTo?: { date: string; slot: string };
  otpVerified?: boolean;
  bookingSource?: 'User' | 'Admin';
  timeline?: ITimelineEvent[];
  createdAt?: string;

  // Payment trail — populated when the booking is created from a verified payment
  paymentStatus?: PaymentStatus;
  paymentSessionId?: string;
  paymentProvider?: PaymentProvider;
  /** Full transaction / UTR id — from the gateway, or pasted by the customer. */
  transactionRef?: string;
  /** Set instead of transactionRef when the customer gave only the last 4 characters. */
  transactionRefLast4?: string;
  providerPaymentId?: string;
  amountPaid?: number | null;
  paidAt?: string | null;
  paymentVerifiedAt?: string | null;
  paymentVerifiedBy?: string;
  verificationMode?: VerificationMode;
  /** Legacy: screenshots are no longer collected, but old bookings still carry one. */
  paymentProofUrl?: string;
  upiReference?: string;
}

export interface IPaymentSession {
  _id?: string;
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
  status: PaymentStatus;
  provider: PaymentProvider;
  providerRefId?: string;
  providerQrImage?: string;
  providerPaymentId?: string;
  /**
   * The complete transaction id — issued by the gateway, or pasted by the
   * customer. Unique across sessions and bookings.
   */
  transactionRef?: string;
  /**
   * Set instead of transactionRef when the customer supplied only the last 4
   * characters. Deliberately NOT unique — 4 characters collide between
   * unrelated customers far too often to be treated as a key.
   */
  transactionRefLast4?: string;
  /** Legacy: no longer collected, retained so old sessions still read back. */
  paymentProofUrl?: string;
  proofHash?: string;
  amountPaid?: number | null;
  paidAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string;
  verificationMode?: VerificationMode;
  failureReason?: string;
  upiReference: string;
  holdActive: boolean;
  holdExpiresAt: string;
  timeline?: ITimelineEvent[];
  createdAt?: string;
  updatedAt?: string;
}

/** Payload returned to the browser while a payment is in progress. */
export interface IPaymentSessionPublic {
  sessionId: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: number;
  packageName: string;
  date: string;
  slot: string;
  name: string;
  phone: string;
  upiReference: string;
  upiId?: string;
  payeeName?: string;
  upiLink?: string;
  qrImage?: string;
  qrIsStatic?: boolean;
  holdExpiresAt: string;
  secondsRemaining: number;
  /**
   * True when the customer must enter their transaction details by hand
   * (no gateway configured to confirm the credit automatically).
   */
  requiresManualSubmission: boolean;
  transactionRef?: string;
  transactionRefLast4?: string;
  failureReason?: string;
  bookingId?: string;
  booking?: IBooking | null;
}

export interface ISlot {
  _id?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM" (used internally)
  displayName?: string; // e.g. "Slot 1"
  capacity: number;
  booked: number;
  remaining?: number;
  isAvailable: boolean;
  statusColor?: 'green' | 'yellow' | 'red' | 'orange';
  statusText?: string;
  /** True while another customer is paying for this slot (temporary hold). */
  onHold?: boolean;
  holdExpiresAt?: string | null;
  bookedInfo?: {
    name: string;
    packageName: string;
    price: number;
  } | null;
}

export interface IPackage {
  _id?: string;
  name: string;
  price: number;
  description: string;
  includedDocuments: string[];
  includedServices: string[];
  gradientTheme?: string;
  isPopular?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ISettings {
  defaultPrice: number;
  holidayDates: string[];
  workingDays: number[];
  theme?: string;

  // Payment configuration
  upiId?: string;
  upiPayeeName?: string;
  /** Uploaded static UPI QR image (used when no gateway is configured). */
  upiQrImageUrl?: string;
  /** Minutes a slot stays on hold while the customer pays. */
  holdMinutes?: number;
}

export interface IAdmin {
  _id?: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt?: string;
}

export interface IActivityLog {
  _id?: string;
  actor: string;
  action: string;
  bookingId?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  timestamp: string;
}

/**
 * An uploaded file held in the database rather than on disk. Serverless hosts
 * (Vercel/Lambda) give the app a read-only filesystem, so nothing can be written
 * under public/ at runtime — the bytes live here and are served by /api/uploads/[id].
 */
export interface IStoredUpload {
  _id?: string;
  filename: string;
  contentType: string;
  size: number;
  hash: string;
  kind: string;
  data: Buffer;
  createdAt?: string;
}

export interface IOtpVerification {
  _id?: string;
  email: string;
  emailOtp: string;
  emailVerified: number; // 0 = Not Verified, 1 = Verified
  emailCreatedAt: string;
  emailExpiresAt: string;
  phone: string;
  phoneOtp: string;
  phoneVerified: number; // 0 = Not Verified, 1 = Verified
  phoneCreatedAt: string;
  phoneExpiresAt: string;
}
