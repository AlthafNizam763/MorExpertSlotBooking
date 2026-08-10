/**
 * Shared name / phone rules, used by the inputs, by the submit handlers and by
 * the API routes so all three agree on what a valid value is.
 *
 * The `sanitize*` helpers *repair* a value — they are what an input writes back
 * to state on every keystroke, so a disallowed character never appears on
 * screen. The `isValid*` helpers *reject* a value — they are the gate, and they
 * must be run against the raw input, otherwise "John123" would be quietly
 * repaired to "John" instead of refused. On the server, always validate first
 * and normalise second.
 */

export const PHONE_LENGTH = 10;

/** A name: letters, separated by single spaces. No digits, no punctuation. */
export const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

/** A phone number: exactly 10 digits, nothing else. */
export const PHONE_PATTERN = /^\d{10}$/;

export const NAME_ERROR = 'Enter a valid name — letters and spaces only.';
export const PHONE_ERROR = 'Enter a valid 10-digit phone number.';

/**
 * Digits only, never longer than 10 — what every phone input writes back on
 * change, so letters, symbols and an 11th digit are simply never accepted.
 *
 * A pasted "+91 98765 43210" or "09876543210" would otherwise truncate to a
 * different number entirely, so a dialling prefix is dropped first — but only
 * when doing so leaves exactly 10 digits, which keeps it from misfiring on a
 * real number that happens to start with 91 while it is still being typed.
 */
export function sanitizePhoneInput(value: unknown): string {
  let digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length === PHONE_LENGTH + 2 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === PHONE_LENGTH + 1 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, PHONE_LENGTH);
}

export function isValidPhone(value: unknown): boolean {
  return PHONE_PATTERN.test(String(value ?? '').trim());
}

/**
 * Letters and single spaces only, with every word capitalised:
 * "althaf nizam" → "Althaf Nizam".
 *
 * A trailing space is kept so the user can carry on typing the next word, and
 * the rest of each word is left exactly as typed so "McDonald" survives.
 */
export function sanitizeNameInput(value: unknown): string {
  const lettersAndSpaces = String(value ?? '')
    .replace(/[^A-Za-z ]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/, '');

  return lettersAndSpaces.replace(/(^| )([a-z])/g, (_full, gap, letter) => gap + letter.toUpperCase());
}

/** Submit-time / storage form of a name: sanitised, capitalised and trimmed. */
export function normalizeName(value: unknown): string {
  return sanitizeNameInput(value).trim();
}

export function isValidName(value: unknown): boolean {
  const name = String(value ?? '')
    .trim()
    .replace(/ {2,}/g, ' ');
  return name.length >= 2 && NAME_PATTERN.test(name);
}

/* ------------------------------------------------------------------ *
 * UPI transaction reference
 *
 * A customer confirms their payment by giving us either the complete
 * transaction / UTR id from their UPI app, or just its last 4 digits. The two
 * are deliberately kept apart everywhere downstream: a full reference is unique
 * enough to be a real key, whereas 4 digits have only 10,000 possible values and
 * would collide between unrelated customers well before the hundredth booking.
 * ------------------------------------------------------------------ */

export const TRANSACTION_LAST4_LENGTH = 4;

/** UPI UTRs are 12 digits; PhonePe/Paytm style references are longer and alphanumeric. */
export const TRANSACTION_ID_PATTERN = /^[A-Z0-9]{6,32}$/;
export const TRANSACTION_LAST4_PATTERN = /^[A-Z0-9]{4}$/;

export const TRANSACTION_ID_ERROR =
  'Enter the complete Transaction ID from your UPI app (6–32 letters or digits).';
export const TRANSACTION_LAST4_ERROR =
  'Enter the last 4 characters of your Transaction ID.';

/** Strips spaces and punctuation, uppercases — what the reference inputs write back. */
export function sanitizeTransactionInput(value: unknown, maxLength = 32): string {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, maxLength);
}

export function normalizeTransactionRef(value: unknown): string {
  return sanitizeTransactionInput(value, 32);
}

export function isValidTransactionId(value: unknown): boolean {
  return TRANSACTION_ID_PATTERN.test(String(value ?? '').trim().toUpperCase());
}

export function isValidTransactionLast4(value: unknown): boolean {
  return TRANSACTION_LAST4_PATTERN.test(String(value ?? '').trim().toUpperCase());
}
