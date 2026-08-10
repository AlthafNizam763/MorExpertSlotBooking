'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  Loader2,
  QrCode,
  Upload,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/Notification/ToastContext';

export default function AdminSettingsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [holdMinutes, setHoldMinutes] = useState(10);
  const [gateway, setGateway] = useState<{
    provider: string;
    razorpayConfigured: boolean;
    webhookConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          const s = json.data || {};
          setUpiId(s.upiId || '');
          setUpiPayeeName(s.upiPayeeName || '');
          setQrImageUrl(s.upiQrImageUrl || '');
          setHoldMinutes(s.holdMinutes ?? 10);
          setGateway(json.gateway || null);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('upiId', upiId.trim());
      form.append('upiPayeeName', upiPayeeName.trim());
      form.append('holdMinutes', String(holdMinutes));
      if (qrFile) form.append('upiQrImage', qrFile);

      const res = await fetch('/api/settings', { method: 'PATCH', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save settings.');

      setQrImageUrl(json.data?.upiQrImageUrl || qrImageUrl);
      setQrFile(null);
      toast.success('Payment settings saved.', 'Settings Updated');
    } catch (err: any) {
      toast.error(err.message || 'Could not save settings.', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQr = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append('removeQrImage', 'true');
      const res = await fetch('/api/settings', { method: 'PATCH', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not remove the QR image.');
      setQrImageUrl('');
      toast.success('Static QR image removed.', 'Removed');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove the QR image.', 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden w-full">
        <div className="pb-6 border-b border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Payment Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure how customers pay and how those payments are verified before a slot is booked.
          </p>
        </div>

        {loading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {/* VERIFICATION MODE */}
            <div
              className={`p-5 rounded-2xl border text-xs flex items-start gap-3 ${
                gateway?.razorpayConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-sm">
                  {gateway?.razorpayConfigured
                    ? 'Automatic verification (Razorpay UPI QR)'
                    : 'Manual verification (UPI QR + admin check)'}
                </p>
                {gateway?.razorpayConfigured ? (
                  <p className="leading-relaxed">
                    Each checkout gets a single-use, amount-locked UPI QR. The server confirms the
                    credit with Razorpay before creating the booking — no admin action needed.
                    {!gateway.webhookConfigured &&
                      ' Set RAZORPAY_WEBHOOK_SECRET to also receive instant webhook confirmations.'}
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    Customers pay to your UPI ID and then enter the Transaction ID of that payment
                    (or just its last 4 digits). Because no gateway API can prove a plain UPI
                    transfer, reconcile those references against your UPI statement on the Payments
                    page. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment to enable
                    fully automatic verification.
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="glass-card-dark p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <span>UPI Collection Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@oksbi"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:border-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    A QR with the exact amount and a unique reference is generated per booking.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Payee Name (shown in the UPI app)
                  </label>
                  <input
                    type="text"
                    value={upiPayeeName}
                    onChange={(e) => setUpiPayeeName(e.target.value)}
                    placeholder="e.g. MorExpert"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="block font-semibold text-slate-300">
                  Fallback static QR image (used only when no UPI ID is set)
                </label>

                <div className="flex flex-wrap items-center gap-4">
                  {qrImageUrl ? (
                    <div className="p-2 bg-white rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrImageUrl}
                        alt="Configured static UPI QR"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-[11px] text-center px-3">
                      No QR uploaded
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 cursor-pointer font-semibold transition-colors">
                      <Upload className="w-4 h-4 text-accent" />
                      <span>{qrFile ? qrFile.name : 'Upload QR image'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    {qrImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveQr}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-semibold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove QR</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-amber-300/80 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  A static QR cannot carry the amount, so the customer types it manually — prefer
                  setting the UPI ID above.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Slot Holds &amp; Verification</span>
                </h3>

                <div className="max-w-xs text-xs">
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Hold slot during payment (minutes)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={holdMinutes}
                    onChange={(e) => setHoldMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    How long a customer has to pay and enter their Transaction ID before the slot is
                    released for someone else.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 leading-relaxed">
                    Customers enter their Transaction ID — or just its last 4 digits — and the
                    booking confirms immediately, with no admin step. A complete Transaction ID can
                    never be used for two bookings; a last-4 reference is too short to be unique, so
                    match those against your statement on amount and time.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Payment Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="glass-card-dark p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Security Status</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                JWT auth middleware enabled with HTTP-only cookies and bcrypt password encryption.
                Booking creation is server-side only and gated on payment verification.
              </p>
              <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-2">
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Webhook endpoint: /api/payments/webhook</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
