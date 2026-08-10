'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import {
  Clock,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { IPaymentSession } from '@/types';
import { formatPrice, getStatusBadgeClass } from '@/lib/utils';

interface GatewayInfo {
  provider: string;
  upiId: string;
  payeeName: string;
  holdMinutes: number;
  hasStaticQr: boolean;
}

/**
 * Read-only view. Bookings confirm themselves the moment a customer submits their
 * transaction details, so there is nothing to approve here — this page exists so an
 * admin can reconcile those references against the UPI statement.
 */
export default function AdminPaymentsPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<IPaymentSession[]>([]);
  const [config, setConfig] = useState<GatewayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'confirmed' | 'active' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const fetchSessions = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/payments/pending?scope=${scope}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setSessions(json.data || []);
        setConfig(json.config || null);
      }
    } catch (err) {
      console.error('Error loading payment sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => fetchSessions(false), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      [
        s.name,
        s.phone,
        s.bookingId,
        s.upiReference,
        s.transactionRef,
        s.transactionRefLast4,
        s.packageName,
        s.slot,
        s.date,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [sessions, search]);

  const confirmedCount = sessions.filter((s) => s.status === 'Booking Confirmed').length;

  const holdRemaining = (session: IPaymentSession) => {
    const ms = new Date(session.holdExpiresAt).getTime() - Date.now();
    if (!session.holdActive) return '—';
    if (ms <= 0) return 'expiring';
    const mins = Math.floor(ms / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-4 sm:p-6 lg:p-10 space-y-6 overflow-x-hidden w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Wallet className="w-7 h-7 text-emerald-400" />
              Payments
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Transaction references and history for every checkout. Bookings confirm automatically
              on submission — no action is needed here.
            </p>
          </div>

          <button
            onClick={() => fetchSessions()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-white border border-slate-700 rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-accent" />
            <span>Refresh</span>
          </button>
        </div>

        {/* MODE BANNER */}
        {config && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              config.provider === 'razorpay'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {config.provider === 'razorpay' ? (
                <p className="font-bold">
                  Razorpay is configured — each UPI credit is confirmed against the gateway
                  server-side.
                </p>
              ) : (
                <>
                  <p className="font-bold">
                    Transaction ID mode — UPI QR ({config.upiId || 'not set'})
                  </p>
                  <p className="text-sky-200/80 leading-relaxed">
                    A booking is confirmed as soon as the customer submits their Transaction ID, so
                    reconcile the references below against your UPI statement periodically. A
                    customer may give only the last 4 digits, which is not unique — match those on
                    amount and time. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to have each
                    payment confirmed against the gateway instead.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, booking ID, transaction ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All payments ({sessions.length})</option>
              <option value="confirmed">Confirmed bookings ({confirmedCount})</option>
              <option value="active">Checkouts in progress</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-card-dark rounded-3xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-slate-400">Loading payments...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <Wallet className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No payments to show</p>
              <p className="text-xs text-slate-500">Nothing matches this view yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4">Customer</th>
                    <th className="py-4 px-4">Package &amp; Amount</th>
                    <th className="py-4 px-4">Date &amp; Slot</th>
                    <th className="py-4 px-4">Transaction ID</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Booking</th>
                    <th className="py-4 px-4">Hold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map((s) => {
                    const badge = getStatusBadgeClass(s.status);

                    return (
                      <tr key={s.sessionId} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-4 px-4 space-y-0.5">
                          <div className="font-bold text-white text-sm">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{s.phone}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-sky-400">{s.packageName}</div>
                          <div className="text-slate-200 font-black">{formatPrice(s.amount)}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-300 font-medium">
                          <div>{s.date}</div>
                          <div className="text-accent text-[11px] font-bold">{s.slot}</div>
                        </td>
                        <td className="py-4 px-4">
                          {s.transactionRef ? (
                            <span className="font-mono font-bold text-emerald-400 tracking-wide break-all">
                              {s.transactionRef}
                            </span>
                          ) : s.transactionRefLast4 ? (
                            <span
                              className="font-mono font-bold text-amber-400 tracking-wide"
                              title="The customer supplied only the last 4 digits — match this against your UPI statement on amount and time."
                            >
                              •••• {s.transactionRefLast4}
                              <span className="block text-[9px] font-sans font-semibold text-amber-500/80 tracking-normal">
                                last 4 only
                              </span>
                            </span>
                          ) : s.paymentProofUrl ? (
                            <button
                              onClick={() => setProofUrl(s.paymentProofUrl!)}
                              className="text-[11px] text-slate-400 hover:text-primary font-bold flex items-center gap-1"
                              title="Legacy booking — confirmed by screenshot before Transaction IDs replaced them"
                            >
                              <ExternalLink className="w-3 h-3" /> Legacy screenshot
                            </button>
                          ) : (
                            <span className="text-slate-500 italic">Not submitted</span>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            ref {s.upiReference}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {s.bookingId ? (
                            <span className="font-mono font-bold text-emerald-400">
                              {s.bookingId}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`flex items-center gap-1.5 font-semibold ${
                              s.holdActive ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {holdRemaining(s)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* LEGACY SCREENSHOT PREVIEW — only reachable for bookings taken before
          Transaction IDs replaced screenshots. Nothing writes these any more. */}
      {proofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm text-primary">Legacy payment screenshot</p>
              <div className="flex items-center gap-3">
                <a
                  href={proofUrl}
                  download
                  className="px-3 py-1.5 bg-primary hover:bg-blue-600 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setProofUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofUrl}
              alt="Payment proof submitted by the customer"
              className="w-full rounded-2xl border border-slate-800"
            />
            <p className="text-[11px] text-slate-500">
              Screenshots can be edited — cross-check the amount and timestamp against your UPI
              statement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
