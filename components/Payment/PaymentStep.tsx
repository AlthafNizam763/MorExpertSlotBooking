'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import { IBooking, IPaymentSessionPublic } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/Notification/ToastContext';

interface PaymentStepProps {
  session: IPaymentSessionPublic;
  onUpdate: (session: IPaymentSessionPublic) => void;
  onConfirmed: (booking: IBooking, session: IPaymentSessionPublic) => void;
  onReleased: (session: IPaymentSessionPublic | null) => void;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  session,
  onUpdate,
  onConfirmed,
  onReleased,
}) => {
  const toast = useToast();
  const [secondsLeft, setSecondsLeft] = useState(session.secondsRemaining);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [polling, setPolling] = useState(false);
  const confirmedRef = useRef(false);

  const isTerminalFailure =
    session.status === 'Payment Failed' ||
    session.status === 'Payment Expired' ||
    session.status === 'Payment Cancelled';

  /* ---------------- countdown ---------------- */
  useEffect(() => {
    setSecondsLeft(session.secondsRemaining);
  }, [session.secondsRemaining, session.sessionId]);

  useEffect(() => {
    if (isTerminalFailure || session.status === 'Booking Confirmed') return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isTerminalFailure, session.status]);

  /* ---------------- status polling ----------------
   * The server re-checks the gateway on every poll, so confirmation is decided
   * server-side. Nothing this component sends can mark a payment as successful. */
  const poll = useCallback(
    async (silent = true) => {
      if (confirmedRef.current) return;
      if (!silent) setPolling(true);
      try {
        const res = await fetch(`/api/payments/session/${session.sessionId}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success) return;

        const next: IPaymentSessionPublic = json.data;
        onUpdate(next);

        if (next.status === 'Booking Confirmed' && next.booking) {
          confirmedRef.current = true;
          onConfirmed(next.booking, next);
        }
      } catch {
        /* transient network issue — the next tick retries */
      } finally {
        if (!silent) setPolling(false);
      }
    },
    [session.sessionId, onUpdate, onConfirmed]
  );

  useEffect(() => {
    if (session.status === 'Booking Confirmed' || isTerminalFailure) return;
    const interval = setInterval(() => poll(true), 5000);
    return () => clearInterval(interval);
  }, [poll, session.status, isTerminalFailure]);

  /* ---------------- actions ---------------- */
  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`, 'Copied');
    } catch {
      toast.warning(`Copy manually: ${value}`, label);
    }
  };

  const handleSelectProof = (file: File | null) => {
    setProofFile(file);
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      toast.warning('Attach a screenshot of your completed payment.', 'Screenshot Required');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('sessionId', session.sessionId);
      form.append('paymentProof', proofFile);

      const res = await fetch('/api/payments/submit', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not submit the screenshot.');

      handleSelectProof(null);

      // The upload itself confirms the booking — go straight to the confirmation.
      if (json.booking) {
        confirmedRef.current = true;
        onConfirmed(json.booking, json.data);
        return;
      }
      onUpdate(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Could not submit the screenshot.', 'Submission Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/payments/session/${session.sessionId}`, { method: 'DELETE' });
      const json = await res.json();
      onReleased(json?.data || null);
      toast.info('Payment cancelled. The slot has been released.', 'Cancelled');
    } catch {
      onReleased(null);
    } finally {
      setCancelling(false);
    }
  };

  /* ---------------- terminal failure ---------------- */
  if (isTerminalFailure) {
    return (
      <div className="pt-6 border-t border-slate-200/80 space-y-4">
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold">
            <AlertTriangle className="w-5 h-5" />
            <span>{session.status}</span>
          </div>
          <p className="text-sm text-rose-800 leading-relaxed">
            {session.failureReason ||
              'The payment window closed before the payment was verified. The slot has been released and no booking was created.'}
          </p>
          <button
            onClick={() => onReleased(session)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            Start again
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- payment pending ---------------- */
  const expired = secondsLeft <= 0;

  return (
    <div className="pt-6 border-t border-slate-200/80 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>5. Pay to Confirm</span>
        </h3>
        <span
          className={`text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            expired
              ? 'bg-rose-100 text-rose-700'
              : secondsLeft < 120
              ? 'bg-amber-100 text-amber-700'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {expired ? 'Hold expired' : `Slot held — ${formatCountdown(secondsLeft)}`}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* QR PANEL */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 text-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount payable</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{formatPrice(session.amount)}</p>
            <p className="text-[11px] text-slate-500 mt-1">{session.packageName}</p>
          </div>

          {session.qrImage ? (
            <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={session.qrImage}
                alt="UPI payment QR code"
                className="w-52 h-52 object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="w-52 h-52 mx-auto rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 px-4">
              Payment QR is not configured. Please contact support.
            </div>
          )}

          {session.qrIsStatic && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Enter the exact amount {formatPrice(session.amount)} manually in your UPI app.
            </p>
          )}

          {session.upiId && (
            <button
              type="button"
              onClick={() => handleCopy(session.upiId!, 'UPI ID')}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <span className="text-left">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  UPI ID
                </span>
                <span className="block text-sm font-bold text-slate-900 font-mono">
                  {session.upiId}
                </span>
              </span>
              <Copy className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          )}

          {session.upiLink && (
            <a
              href={session.upiLink}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Pay from this phone</span>
            </a>
          )}

          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Booking reference{' '}
            <span className="font-mono font-bold text-slate-700">{session.upiReference}</span> is
            already inside the QR — nothing to type.
          </div>
        </div>

        {/* CONFIRMATION PANEL */}
        <div className="space-y-4">
          {session.requiresManualSubmission ? (
            <form
              onSubmit={handleSubmitProof}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4"
            >
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    After paying, upload your payment screenshot
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    That is all we need — your booking is confirmed and the slot is locked as soon
                    as the screenshot uploads.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment screenshot *
                </label>

                {proofPreview ? (
                  <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofPreview}
                        alt="Selected payment screenshot"
                        className="w-16 h-16 object-cover rounded-lg border border-emerald-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">
                          {proofFile?.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          {proofFile ? `${(proofFile.size / 1024).toFixed(0)} KB` : ''} · ready to
                          submit
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectProof(null)}
                        className="ml-auto p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 shrink-0"
                        aria-label="Remove selected screenshot"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center gap-1.5 px-4 py-6 rounded-xl border border-dashed border-slate-300 bg-white text-slate-500 transition-colors ${
                      expired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:text-primary'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-bold">Tap to upload your payment screenshot</span>
                    <span className="text-[10px]">PNG, JPG or WebP · max 5 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={expired}
                      onChange={(e) => handleSelectProof(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || expired || !proofFile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-extrabold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming your booking...</span>
                  </>
                ) : (
                  <span>Upload screenshot &amp; confirm booking</span>
                )}
              </button>
            </form>
          ) : (
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Waiting for your payment</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Scan the QR and pay from any UPI app. This page confirms automatically the
                    moment the payment gateway reports the credit — usually within seconds.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => poll(false)}
                disabled={polling}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
                Check payment status now
              </button>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2 text-[11px]">
            <p className="font-bold text-white text-xs uppercase tracking-wider">Booking summary</p>
            <div className="flex justify-between">
              <span className="text-slate-400">Name</span>
              <span className="font-semibold">{session.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone</span>
              <span className="font-semibold font-mono">{session.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date &amp; slot</span>
              <span className="font-semibold">
                {session.date} · {session.slot}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">Package</span>
              <span className="font-semibold text-sky-300">{session.packageName}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            {cancelling ? 'Releasing slot...' : 'Cancel payment and release slot'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStep;
