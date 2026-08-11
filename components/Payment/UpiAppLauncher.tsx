'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Monitor, Smartphone } from 'lucide-react';
import {
  DevicePlatform,
  UpiApp,
  UpiAppId,
  appsForPlatform,
  buildAppLink,
  buildSystemChooserLink,
  detectPlatform,
  launchUpiLink,
  storeLink,
} from '@/lib/payments/upiApps';

interface UpiAppLauncherProps {
  /** The `upi://pay?…` URI the server built — amount and reference already inside. */
  upiLink: string;
  disabled?: boolean;
  /** Fired once an app actually took over, so the caller can prompt for the ref. */
  onLaunched?: (appName: string) => void;
}

/**
 * Apps a probe has already shown are missing from this phone. Kept in
 * sessionStorage because the Android fallback path reloads the page — the
 * booking page restores its payment session, and this restores what we learnt
 * about the phone alongside it.
 */
const MISSING_KEY = 'morexpert.upi.missingApps';

function readMissing(): UpiAppId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(MISSING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistMissing(ids: UpiAppId[]) {
  try {
    window.sessionStorage.setItem(MISSING_KEY, JSON.stringify(ids));
  } catch {
    /* private mode — the probe just won't be remembered across a reload */
  }
}

const AppTile: React.FC<{
  app: UpiApp;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ app, busy, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100"
  >
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
      style={{ backgroundColor: app.brand }}
      aria-hidden="true"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : app.initials}
    </span>
    <span className="text-[10px] font-bold text-slate-700 leading-tight text-center">
      {app.short}
    </span>
  </button>
);

export const UpiAppLauncher: React.FC<UpiAppLauncherProps> = ({
  upiLink,
  disabled = false,
  onLaunched,
}) => {
  // Resolved after mount only — deciding this during SSR would bake the
  // server's idea of the device into the markup.
  const [platform, setPlatform] = useState<DevicePlatform | null>(null);
  const [missing, setMissing] = useState<UpiAppId[]>([]);
  const [busy, setBusy] = useState<UpiAppId | 'system' | null>(null);
  const [notice, setNotice] = useState<{ app: UpiApp; store: string | null } | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setMissing(readMissing());
  }, []);

  const candidates = useMemo(
    () => (platform ? appsForPlatform(platform) : []),
    [platform]
  );
  const available = useMemo(
    () => candidates.filter((a) => !missing.includes(a.id)),
    [candidates, missing]
  );
  const ruledOut = useMemo(
    () => candidates.filter((a) => missing.includes(a.id)),
    [candidates, missing]
  );

  const markMissing = useCallback((app: UpiApp, plat: DevicePlatform) => {
    setMissing((prev) => {
      if (prev.includes(app.id)) return prev;
      const next = [...prev, app.id];
      persistMissing(next);
      return next;
    });
    setNotice({ app, store: storeLink(app, plat) });
  }, []);

  /** Opens one specific app, and remembers it if the phone doesn't have it. */
  const openApp = useCallback(
    (app: UpiApp) => {
      if (!platform || disabled) return;
      const link = buildAppLink(app, upiLink, platform, window.location.href);
      if (!link) return;

      setNotice(null);
      setBusy(app.id);
      // Called synchronously so the click gesture is still live.
      launchUpiLink(link).then((opened) => {
        setBusy(null);
        if (opened) onLaunched?.(app.name);
        else markMissing(app, platform);
      });
    },
    [platform, disabled, upiLink, onLaunched, markMissing]
  );

  /**
   * Hands the payment to Android itself. The system knows what is installed:
   * one UPI app opens straight into it, several raise the native chooser
   * listing only those apps.
   */
  const openViaSystem = useCallback(() => {
    if (disabled) return;
    setNotice(null);
    setBusy('system');
    launchUpiLink(buildSystemChooserLink(upiLink, window.location.href)).then((opened) => {
      setBusy(null);
      if (opened) onLaunched?.('your UPI app');
    });
  }, [disabled, upiLink, onLaunched]);

  if (!platform) return null;

  /* ---------------- desktop ---------------- */
  if (platform === 'desktop') {
    return (
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
        <Monitor className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          You&apos;re on a computer — scan the QR above with any UPI app on your phone. Open this
          page on your phone instead to pay with a single tap.
        </p>
      </div>
    );
  }

  /* ---------------- phone ---------------- */
  // Android lets the OS resolve it. On iOS there is no system chooser, so a
  // direct button only makes sense once probing has left a single app standing.
  const soleApp = available.length === 1 ? available[0] : null;
  const showSystemButton = platform === 'android';
  const showDirectButton = platform === 'ios' && Boolean(soleApp);

  return (
    <div className="space-y-2.5 text-left">
      {showSystemButton && (
        <button
          type="button"
          onClick={soleApp ? () => openApp(soleApp) : openViaSystem}
          disabled={disabled || busy !== null}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {busy === 'system' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span>{soleApp ? `Pay with ${soleApp.name}` : 'Pay with a UPI app'}</span>
        </button>
      )}

      {showDirectButton && soleApp && (
        <button
          type="button"
          onClick={() => openApp(soleApp)}
          disabled={disabled || busy !== null}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {busy === soleApp.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span>Pay with {soleApp.name}</span>
        </button>
      )}

      {available.length > 0 && !soleApp && (
        <>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {showSystemButton ? 'Or open one directly' : 'Choose your UPI app'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {available.map((app) => (
              <AppTile
                key={app.id}
                app={app}
                busy={busy === app.id}
                disabled={disabled || (busy !== null && busy !== app.id)}
                onClick={() => openApp(app)}
              />
            ))}
          </div>
        </>
      )}

      {available.length === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          None of the UPI apps we can open are on this phone. Scan the QR above from another device,
          or copy the UPI ID and pay from any UPI app manually.
        </p>
      )}

      {notice && (
        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
          <strong className="text-slate-800">{notice.app.name}</strong> didn&apos;t open — it
          doesn&apos;t look installed on this phone, so we&apos;ve taken it off the list.
          {notice.store && (
            <>
              {' '}
              <a
                href={notice.store}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary underline underline-offset-2"
              >
                Get it
              </a>
              , or pick another app above.
            </>
          )}
        </div>
      )}

      {ruledOut.length > 0 && (
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Not on this phone: {ruledOut.map((a) => a.name).join(', ')}.
        </p>
      )}
    </div>
  );
};

export default UpiAppLauncher;
