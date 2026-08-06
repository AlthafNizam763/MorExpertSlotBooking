'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar/Navbar';
import { Footer } from '@/components/Footer/Footer';
import {
  Search,
  FileCheck,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  DollarSign,
  MessageSquare,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  GitCommit,
  Check,
  Sparkles,
  RefreshCw,
  Package,
} from 'lucide-react';
import { IBooking } from '@/types';
import { formatPrice, getStatusBadgeClass } from '@/lib/utils';
import { useToast } from '@/components/Notification/ToastContext';

function TrackContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [query, setQuery] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IBooking[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [acceptingReschedule, setAcceptingReschedule] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/bookings?lookup=${encodeURIComponent(query.trim())}`);
      const json = await res.json();

      if (json.success) {
        setResults(json.data);
      } else {
        setError(json.error || 'No matching booking record found.');
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search booking status.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleSearch();
    }
  }, [initialId]);

  const handleAcceptRescheduledSlot = async (bookingId: string) => {
    setAcceptingReschedule(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          remarks: 'Candidate accepted rescheduled slot.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Rescheduled slot accepted! Your session is confirmed.', 'Slot Accepted');
        handleSearch();
      } else {
        toast.error(json.error || 'Failed to accept rescheduled slot.', 'Action Failed');
      }
    } catch (err) {
      toast.error('Error accepting rescheduled slot.', 'Network Error');
    } finally {
      setAcceptingReschedule(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 font-sans">
      {/* HEADER & SEARCH BAR */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-secondary tracking-tight">
          Track Your Booking Status
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
          Enter your Booking ID (e.g. <span className="font-mono text-primary font-bold">MB-94A21X</span>) or registered phone number to check live review status and timeline.
        </p>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Booking ID or Phone Number..."
              className="w-full pl-12 pr-4 py-3.5 glass-input text-base text-slate-900 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-md shadow-primary/20 transition-all shrink-0 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {/* RESULTS DISPLAY */}
      {searched && (
        <div className="space-y-6 pt-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {results && results.length === 0 && !error && (
            <div className="glass-card p-12 text-center rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Booking Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                We couldn't find any booking matching "{query}". Please double-check your Booking ID or phone number.
              </p>
            </div>
          )}

          {results &&
            results.map((booking) => {
              const badgeStyle = getStatusBadgeClass(booking.status);
              return (
                <div
                  key={booking.bookingId}
                  className="glass-card p-6 sm:p-8 rounded-3xl border border-white shadow-xl space-y-6 animate-in fade-in duration-300"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                        Booking Reference
                      </span>
                      <h2 className="text-2xl font-extrabold text-primary font-mono">
                        {booking.bookingId}
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>

                  {/* Reschedule Alert banner if status is Rescheduled */}
                  {booking.status === 'Rescheduled' && (
                    <div className="p-5 bg-purple-500/10 border border-purple-500/30 text-purple-900 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 font-bold text-base text-purple-700">
                        <RefreshCw className="w-5 h-5 text-purple-600" />
                        <span>Booking Rescheduled by MorExpert Admin</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">
                        Your original slot was unavailable. Admin has proposed a rescheduled slot:
                        <span className="font-bold text-purple-800 ml-1">
                          {booking.date} ({booking.slot})
                        </span>
                      </p>
                      <div className="pt-2 flex gap-3">
                        <button
                          onClick={() => handleAcceptRescheduledSlot(booking._id || booking.bookingId)}
                          disabled={acceptingReschedule}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                          {acceptingReschedule ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Accept Rescheduled Slot</span>
                            </>
                          )}
                        </button>
                        <a
                          href="/book"
                          className="px-4 py-2.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold rounded-xl"
                        >
                          Request Another Slot
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Candidate Name
                      </p>
                      <p className="font-bold text-slate-900">{booking.name}</p>
                    </div>

                    {booking.packageName && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          Selected Package
                        </p>
                        <p className="font-bold text-primary">{booking.packageName}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Booked Date & Slot
                      </p>
                      <p className="font-bold text-slate-900">
                        {booking.date} ({booking.slot})
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        Assigned Price
                      </p>
                      <p className="font-extrabold text-primary text-base">
                        {formatPrice(booking.price || booking.packagePrice)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        Phone Number
                      </p>
                      <p className="font-medium text-slate-800">{booking.phone}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        Email Address
                      </p>
                      <p className="font-medium text-slate-800">{booking.email}</p>
                    </div>

                    {/* Uploaded Resume Section - Rendered ONLY if resume exists */}
                    {booking.resume && booking.resume.trim() !== '' && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Uploaded Resume
                        </p>
                        <a
                          href={booking.resume}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1 rounded-lg"
                        >
                          <span>View PDF Resume</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Public Admin Remarks section */}
                  {(booking.publicNotes || booking.remarks) && (
                    <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                      <p className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        MorExpert Feedback & Recommendations
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        "{booking.publicNotes || booking.remarks}"
                      </p>
                    </div>
                  )}

                  {/* BOOKING ACTIVITY TIMELINE */}
                  <div className="pt-4 border-t border-slate-200/80 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-primary" />
                      <span>Booking Lifecycle Timeline</span>
                    </h3>

                    <div className="space-y-3 pl-2">
                      {[
                        { title: 'Booking Submitted', date: booking.createdAt, actor: 'Candidate' },
                        { title: 'Email OTP Verified', date: booking.createdAt, actor: 'System' },
                        { title: `Current Status: ${booking.status}`, date: 'Just now', actor: 'Admin' },
                      ].map((t, idx) => (
                        <div key={idx} className="flex items-start gap-3 relative">
                          <div className="w-3 h-3 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/40" />
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-slate-800">{t.title}</p>
                            <p className="text-[11px] text-slate-500">
                              By {t.actor} • {t.date ? new Date(t.date).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading tracking portal...</div>}>
          <TrackContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
