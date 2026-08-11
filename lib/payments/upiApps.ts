/**
 * Launching the customer's own UPI app from the payment step.
 *
 * A web page cannot enumerate the apps installed on a phone — every browser
 * blocks that on purpose, and `navigator.getInstalledRelatedApps()` only ever
 * sees apps that declare a relationship with our own domain, so it can never
 * see Google Pay or PhonePe. Two things *are* genuinely possible, and this
 * module does both:
 *
 *  1. Hand the payment to the OS. On Android an `intent://` URI carrying
 *     `scheme=upi` is resolved by the system, which does know what is
 *     installed: exactly one UPI app opens straight into it, several show the
 *     system chooser listing only those apps. That is real detection, done by
 *     the only component allowed to do it.
 *  2. Probe one app at a time. Opening an app's own scheme takes the browser
 *     to the background; if that never happens the app is not there. The
 *     caller remembers the misses, so the list narrows to what the phone
 *     actually has.
 *
 * Everything here is client-safe — no node built-ins, so it can be imported
 * from a 'use client' component.
 */

export type DevicePlatform = 'android' | 'ios' | 'desktop';

export type UpiAppId = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'amazonpay' | 'cred';

export interface UpiApp {
  id: UpiAppId;
  /** Full name, used in prompts and error copy. */
  name: string;
  /** Short label that fits under a tile. */
  short: string;
  initials: string;
  /** Tile colour — brand-ish, deliberately not the trademarked logo. */
  brand: string;
  /**
   * Android package id. Present for every app we support: on Android the
   * targeted `intent://` link is what makes a tile open that one app.
   */
  androidPackage: string;
  /**
   * iOS URL scheme *including* the path the app expects, e.g. `gpay://upi/pay`.
   * Absent when the app publishes no usable scheme — the tile is then hidden
   * on iOS rather than offered as a link that silently does nothing.
   */
  iosScheme?: string;
}

/**
 * Ordered by how likely an Indian customer is to have the app, so the first
 * tiles are the ones most people reach for.
 */
export const UPI_APPS: UpiApp[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    short: 'PhonePe',
    initials: 'Pe',
    brand: '#5f259f',
    androidPackage: 'com.phonepe.app',
    iosScheme: 'phonepe://pay',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    short: 'Google Pay',
    initials: 'GP',
    brand: '#1a73e8',
    androidPackage: 'com.google.android.apps.nbu.paisa.user',
    iosScheme: 'gpay://upi/pay',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    short: 'Paytm',
    initials: 'Pt',
    brand: '#00baf2',
    androidPackage: 'net.one97.paytm',
    iosScheme: 'paytmmp://pay',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    short: 'BHIM',
    initials: 'BH',
    brand: '#f26522',
    androidPackage: 'in.org.npci.upiapp',
    iosScheme: 'bhim://upi/pay',
  },
  {
    id: 'cred',
    name: 'CRED',
    short: 'CRED',
    initials: 'CR',
    brand: '#1c1c28',
    androidPackage: 'com.dreamplug.androidapp',
    iosScheme: 'credpay://upi/pay',
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    short: 'Amazon Pay',
    initials: 'AP',
    brand: '#ff9900',
    androidPackage: 'in.amazon.mShop.android.shopping',
    // Amazon publishes no dependable UPI scheme on iOS — Android only.
  },
];

/* ------------------------------------------------------------------ *
 * Platform
 * ------------------------------------------------------------------ */

/**
 * Only ever called from the browser after mount — reading the user agent
 * during SSR would bake the server's answer into the markup.
 */
export function detectPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent || '';

  // User-Agent Client Hints are the accurate source where Chrome offers them.
  const hinted = (navigator as any).userAgentData?.platform;
  if (typeof hinted === 'string' && /android/i.test(hinted)) return 'android';

  if (/android/i.test(ua)) return 'android';

  // iPadOS 13+ reports a desktop Safari UA, so touch support is the tell.
  const isIpadOS =
    /Macintosh/.test(ua) &&
    typeof document !== 'undefined' &&
    (navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOS) return 'ios';

  return 'desktop';
}

/** Apps that can actually be opened on this platform. */
export function appsForPlatform(platform: DevicePlatform): UpiApp[] {
  if (platform === 'android') return UPI_APPS;
  if (platform === 'ios') return UPI_APPS.filter((a) => a.iosScheme);
  return [];
}

/* ------------------------------------------------------------------ *
 * Link building
 * ------------------------------------------------------------------ */

/**
 * Pulls the query out of the `upi://pay?…` URI the server built. Reusing the
 * server's string verbatim is what keeps the amount and the `tr` reference
 * identical to the QR — the deep links are the same payment, just a different
 * way of reaching it.
 */
function upiQuery(upiLink: string): string {
  const q = upiLink.indexOf('?');
  return q === -1 ? '' : upiLink.slice(q + 1);
}

function intentUri(query: string, pkg: string | null, fallbackUrl?: string): string {
  const parts = ['scheme=upi'];
  if (pkg) parts.push(`package=${pkg}`);
  if (fallbackUrl) parts.push(`S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`);
  return `intent://pay?${query}#Intent;${parts.join(';')};end`;
}

/**
 * The "let the OS decide" link — Android only. The system matches it against
 * every installed UPI app: one match opens directly, several raise the native
 * chooser. If nothing handles UPI at all, Chrome lands on `fallbackUrl`
 * instead of an error page (the booking page restores its own session, so
 * coming back is harmless).
 */
export function buildSystemChooserLink(upiLink: string, fallbackUrl?: string): string {
  return intentUri(upiQuery(upiLink), null, fallbackUrl);
}

/** A link that opens one specific app, or fails cleanly if it is not there. */
export function buildAppLink(
  app: UpiApp,
  upiLink: string,
  platform: DevicePlatform,
  fallbackUrl?: string
): string | null {
  const query = upiQuery(upiLink);
  if (!query) return null;

  if (platform === 'android') return intentUri(query, app.androidPackage, fallbackUrl);
  if (platform === 'ios' && app.iosScheme) return `${app.iosScheme}?${query}`;
  return null;
}

/** Play Store / App Store page, offered only after a probe came back empty. */
export function storeLink(app: UpiApp, platform: DevicePlatform): string | null {
  if (platform === 'android') {
    return `https://play.google.com/store/apps/details?id=${app.androidPackage}`;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Launching + availability probe
 * ------------------------------------------------------------------ */

/**
 * Navigates to a UPI deep link and reports whether an app took over.
 *
 * Leaving for an app backgrounds the page, which fires `visibilitychange` /
 * `pagehide` / `blur`; the Android chooser dialog does the same, and a chooser
 * means apps exist, so both count as "opened". Silence past the timeout means
 * nothing on the phone claimed the link.
 *
 * Must be called straight from a click handler with no `await` before it —
 * browsers only allow scheme navigation while the user gesture is live.
 */
export function launchUpiLink(url: string, timeoutMs = 2200): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    let settled = false;
    let timer = 0;

    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('blur', onLeave);
      resolve(opened);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') finish(true);
    };
    const onLeave = () => finish(true);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('blur', onLeave);
    timer = window.setTimeout(() => finish(false), timeoutMs);

    try {
      window.location.href = url;
    } catch {
      finish(false);
    }
  });
}
