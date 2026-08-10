/**
 * Central status vocabulary for the payment-first booking flow.
 *
 * A slot is only permanently unavailable once a Booking exists with a status
 * that is NOT in RELEASED_BOOKING_STATUSES. Bookings are created exclusively by
 * lib/payments/sessions.ts after a payment has been verified.
 */

export const PAYMENT_STATUS = {
  PENDING: 'Payment Pending',
  SUBMITTED: 'Payment Submitted',
  VERIFIED: 'Payment Verified',
  FAILED: 'Payment Failed',
  EXPIRED: 'Payment Expired',
  CANCELLED: 'Payment Cancelled',
  CONFIRMED: 'Booking Confirmed',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Session statuses that still occupy (hold) the slot. */
export const ACTIVE_SESSION_STATUSES: PaymentStatus[] = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.SUBMITTED,
  PAYMENT_STATUS.VERIFIED,
];

/** Session statuses that no longer occupy the slot. */
export const RELEASED_SESSION_STATUSES: PaymentStatus[] = [
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.EXPIRED,
  PAYMENT_STATUS.CANCELLED,
];

/** Booking statuses that free the slot up again. */
export const RELEASED_BOOKING_STATUSES = [
  'Cancelled',
  'Rejected',
  'Payment Failed',
  'Payment Expired',
  'Payment Cancelled',
];

/** Mongo filter matching bookings that currently occupy a slot. */
export const OCCUPYING_BOOKING_FILTER = {
  status: { $nin: RELEASED_BOOKING_STATUSES },
};

export function bookingOccupiesSlot(status?: string | null): boolean {
  if (!status) return false;
  return !RELEASED_BOOKING_STATUSES.includes(status);
}
