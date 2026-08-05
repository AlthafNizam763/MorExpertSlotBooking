'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  Upload,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Mail,
  RefreshCw,
  Package as PackageIcon,
  CheckCircle2,
} from 'lucide-react';
import { ISlot, IBooking, IPackage } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/Notification/ToastContext';

function CalendlyCalendarContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const urlPackageId = searchParams.get('packageId');

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Packages state
  const [packages, setPackages] = useState<IPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<IPackage | null>(null);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);

  // Slots state
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<ISlot[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  const [bookingSuccess, setBookingSuccess] = useState<IBooking | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const dateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  // Fetch Packages
  useEffect(() => {
    async function fetchPackages() {
      try {
        setLoadingPackages(true);
        const res = await fetch('/api/packages');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const active = json.data.filter((p: IPackage) => p.isActive !== false);
          setPackages(active);
          
          if (urlPackageId) {
            const found = active.find((p: IPackage) => p._id === urlPackageId);
            if (found) setSelectedPackage(found);
            else if (active.length > 0) setSelectedPackage(active[0]);
          } else if (active.length > 0) {
            setSelectedPackage(active[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    }
    fetchPackages();
  }, [urlPackageId]);

  // Fetch slots for selected date
  useEffect(() => {
    if (!dateKey) return;
    async function fetchSlots() {
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/slots?date=${dateKey}`);
        const json = await res.json();
        if (json.success) {
          setAvailableSlots(json.data);
        }
      } catch (err) {
        console.error('Error loading slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchSlots();
  }, [dateKey]);

  // Resend Timer Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOtpModal && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, resendTimer]);

  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setFileError('Only PDF files are supported.');
        setResumeFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size exceeds 10MB limit.');
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
    }
  };

  const handleInitiateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) {
      toast.warning('Please select a review package before booking.', 'Package Required');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast.warning('Please select a date and slot.', 'Slot Required');
      return;
    }
    if (!name || !email || !phone) {
      toast.warning('Please complete all required fields (Name, Email, Phone).', 'Missing Details');
      return;
    }

    // Trigger OTP sending
    setSendingOtp(true);
    setOtpError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send OTP.');
      }

      setOtpSuccessMessage(json.message);
      setShowOtpModal(true);
      setResendTimer(30);
      toast.info(`OTP code sent to ${email}`, 'Verification Code Sent');
    } catch (err: any) {
      toast.error(err.message || 'Could not send verification OTP.', 'OTP Error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtpAndCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      // 1. Verify OTP
      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.success) {
        throw new Error(verifyJson.error || 'Invalid OTP code.');
      }

      // 2. Submit Booking FormData
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('date', dateKey);
      formData.append('slot', selectedSlot!);
      formData.append('packageName', selectedPackage ? selectedPackage.name : 'Standard Package');
      formData.append('packagePrice', selectedPackage ? selectedPackage.price.toString() : '500');
      formData.append('notes', notes);
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit booking.');
      }

      setShowOtpModal(false);
      setBookingSuccess(json.booking);

      // Trigger Confetti!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setOtpError(err.message || 'Submission error.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    setOtpError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Resend failed.');
      }

      setOtpSuccessMessage(json.message);
      setResendTimer(30);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.warn('Copy failed', e);
    }
    document.body.removeChild(textArea);
  };

  const copyBookingId = () => {
    if (bookingSuccess) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(bookingSuccess.bookingId).catch(() => {
          fallbackCopyText(bookingSuccess.bookingId);
        });
      } else {
        fallbackCopyText(bookingSuccess.bookingId);
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Email Verification</h3>
                  <p className="text-xs text-slate-500">OTP sent to {email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {otpSuccessMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndCreateBooking} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Enter 6-Digit OTP Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 glass-input font-bold text-primary"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  OTP expires in 5 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp}
                className="w-full py-4 px-6 text-sm font-bold text-white bg-primary hover:bg-blue-600 rounded-2xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
              >
                {verifyingOtp ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Verify OTP & Create Booking</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  className="font-bold text-primary hover:underline disabled:text-slate-400 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP Now'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CONFETTI MODAL */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">OTP Verified & Booking Submitted!</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your request is now <span className="font-bold text-amber-600">Pending Admin Approval</span>.
              </p>
            </div>

            {/* Booking Details Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Booking ID</span>
                <div className="flex items-center gap-2 font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  <span>{bookingSuccess.bookingId}</span>
                  <button onClick={copyBookingId} className="hover:text-blue-700">
                    {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Candidate Name</span>
                <span className="font-semibold text-slate-800">{bookingSuccess.name}</span>
              </div>

              {bookingSuccess.packageName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Package</span>
                  <span className="font-semibold text-primary">{bookingSuccess.packageName}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">Date & Slot</span>
                <span className="font-semibold text-slate-800">
                  {bookingSuccess.date} ({bookingSuccess.slot})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {bookingSuccess.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Price</span>
                <span className="font-bold text-primary">
                  {formatPrice(bookingSuccess.price || bookingSuccess.packagePrice)}
                </span>
              </div>

              {/* Uploaded Resume section only if resume exists */}
              {bookingSuccess.resume && bookingSuccess.resume.trim() !== '' && (
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Uploaded Resume</span>
                  <a
                    href={bookingSuccess.resume}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View Resume PDF
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`/track?id=${bookingSuccess.bookingId}`}
                className="w-full py-3.5 px-4 text-sm font-bold text-white bg-primary hover:bg-blue-600 rounded-2xl shadow-lg shadow-primary/25 transition-all text-center"
              >
                Track Booking Status
              </a>
              <button
                onClick={() => {
                  setBookingSuccess(null);
                  setSelectedSlot(null);
                }}
                className="w-full py-3 px-4 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDLY MAIN CONTAINER */}
      <div className="glass-card rounded-3xl border border-white/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 font-sans">
        {/* LEFT / TOP HEADER INFO */}
        <div className="lg:col-span-4 bg-slate-900 text-white p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-accent border border-accent/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MorExpert Slot Booking</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Resume Review Session
            </h2>

            <div className="space-y-3 text-sm text-slate-300 pt-2">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent shrink-0" />
                <span>30-45 Minutes Live Consultation</span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-accent shrink-0" />
                <span>Selected Date: {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'None'}</span>
              </div>
              <div className="flex items-center gap-3">
                <PackageIcon className="w-5 h-5 text-accent shrink-0" />
                <span>
                  Package: {selectedPackage ? `${selectedPackage.name} (${formatPrice(selectedPackage.price)})` : 'Standard Review'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
                <span>Requires Email OTP Verification</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent shrink-0" />
                <span>PDF Resume Upload (Max 10MB)</span>
              </div>
            </div>
          </div>

          {/* Color Indicators Legend */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2 text-xs">
            <p className="font-semibold text-slate-300 mb-1 uppercase tracking-wider">Slot Availability Logic</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Available Slots (&gt;1 left)
              </span>
              <span className="text-emerald-400 font-semibold">Green</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Limited (1 Slot Left)
              </span>
              <span className="text-amber-400 font-semibold">Yellow</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Fully Booked / Disabled
              </span>
              <span className="text-rose-400 font-semibold">Red</span>
            </div>
          </div>
        </div>

        {/* RIGHT CALENDAR & BOOKING ENGINE */}
        <div className="lg:col-span-8 p-6 sm:p-8 bg-white/80 space-y-8">
          {/* STEP 1: PACKAGE SELECTION SECTION */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-primary" />
              <span>Select Package</span>
            </h3>

            {loadingPackages ? (
              <div className="p-4 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?._id === pkg._id;
                  return (
                    <button
                      key={pkg._id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white border-primary shadow-xl ring-2 ring-primary/40'
                          : 'bg-white hover:border-slate-300 border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-extrabold uppercase ${isSelected ? 'text-sky-400' : 'text-slate-500'}`}>
                            {pkg.isPopular ? 'Popular' : 'Package'}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-sm font-extrabold truncate">{pkg.name}</p>
                        <p className={`text-xs mt-1 font-bold ${isSelected ? 'text-sky-300' : 'text-primary'}`}>
                          {formatPrice(pkg.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: MONTHLY CALENDAR GRID */}
          <div className="pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={idx}
                    disabled={isPast || !isCurrentMonth}
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedSlot(null);
                    }}
                    className={`h-14 sm:h-16 rounded-2xl p-1.5 flex flex-col justify-between transition-all border ${
                      !isCurrentMonth
                        ? 'opacity-20 cursor-not-allowed border-transparent'
                        : isPast
                        ? 'opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-semibold">{format(day, 'd')}</span>
                      {!isPast && isCurrentMonth && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    {isCurrentMonth && !isPast && (
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        Slots
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: SELECT THE SLOT (Slot 1, Slot 2, Slot 3...) */}
          {selectedDate && (
            <div className="pt-6 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">
                  Select The Slot for {format(selectedDate, 'MMM d, yyyy')}
                </h4>
                {slotsLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availableSlots.map((s, idx) => {
                  const isSelected = selectedSlot === s.time;

                  // Remaining slots count logic:
                  // 🟢 Available Slots (remaining > 1) – Green
                  // 🟡 Limited Slots (Only 1 Slot Left) – Yellow
                  // 🔴 Fully Booked / Disabled – Red
                  const isBookable = s.isAvailable && (s.remaining === undefined || s.remaining > 0);
                  const remainingCount = s.remaining !== undefined ? s.remaining : (s.isAvailable ? 1 : 0);

                  let statusText = s.statusText;
                  let colorTheme = s.statusColor || 'green';

                  if (!isBookable || remainingCount <= 0) {
                    colorTheme = 'red';
                    statusText = 'Fully Booked';
                  } else if (remainingCount === 1) {
                    colorTheme = 'yellow';
                    statusText = 'Limited (1 Slot Left)';
                  } else {
                    colorTheme = 'green';
                    statusText = `Available (${remainingCount} Slots Left)`;
                  }

                  const displayName = s.displayName || `Slot ${idx + 1}`;

                  return (
                    <button
                      key={s.time}
                      disabled={!isBookable}
                      onClick={() => setSelectedSlot(s.time)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        !isBookable
                          ? 'bg-rose-50/50 border-rose-200 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 font-bold'
                          : colorTheme === 'yellow'
                          ? 'bg-amber-50/80 hover:border-amber-400 border-amber-200 text-slate-900'
                          : colorTheme === 'red'
                          ? 'bg-rose-50/80 border-rose-200 text-rose-700'
                          : 'bg-emerald-50/40 hover:border-emerald-400 border-emerald-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base font-extrabold">{displayName}</span>
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-white'
                              : colorTheme === 'green'
                              ? 'bg-emerald-500'
                              : colorTheme === 'yellow'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : colorTheme === 'green'
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                              : colorTheme === 'yellow'
                              ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 font-bold'
                              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold'
                          }`}
                        >
                          {statusText}
                        </span>
                        <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: CANDIDATE DETAILS & RESUME UPLOAD FORM */}
          {selectedSlot && (
            <form
              onSubmit={handleInitiateBooking}
              className="pt-6 border-t border-slate-200/80 space-y-5 animate-in fade-in duration-300"
            >
              <h4 className="text-lg font-bold text-slate-900 flex items-center justify-between flex-wrap gap-2">
                <span>Enter Your Details</span>
                <div className="flex items-center gap-2">
                  {selectedPackage && (
                    <span className="text-xs font-semibold px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full">
                      Package: {selectedPackage.name}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                    Selected: {availableSlots.find((s) => s.time === selectedSlot)?.displayName || 'Slot'}
                  </span>
                </div>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-4 py-3 glass-input text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-3 glass-input text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (WhatsApp preferred) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 glass-input text-sm text-slate-900"
                />
              </div>

              {/* PDF Resume File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Upload Current Resume (PDF only, Max 10MB) (Optional)
                </label>

                <div className="relative border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    {resumeFile ? (
                      <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>{resumeFile.name} ({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-800">
                          Click to upload or drag & drop PDF resume
                        </p>
                        <p className="text-xs text-slate-400">PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                {fileError && <p className="text-xs text-rose-500 mt-1 font-medium">{fileError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Specific Target Roles (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Targeting Senior Frontend Engineer roles at Google/Amazon..."
                  className="w-full px-4 py-3 glass-input text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={sendingOtp}
                className="w-full py-4 px-6 text-base font-bold text-white bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary rounded-2xl shadow-xl shadow-primary/25 hover:shadow-2xl transition-all flex items-center justify-center gap-2"
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Email OTP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Verify Email OTP & Confirm Slot</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export const CalendlyCalendar: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm font-medium">Loading Calendar...</p>
        </div>
      }
    >
      <CalendlyCalendarContent />
    </Suspense>
  );
};
