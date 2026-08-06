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
  AlertCircle,
  Sparkles,
  Loader2,
  Package as PackageIcon,
  CheckCircle2,
  User,
  Phone,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  FileText,
  DollarSign,
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

  // Simplified Form State (Full Name & Phone Number ONLY)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<IBooking | null>(null);

  // All Bookings for calendar summary & fully-booked calculation
  const [allBookings, setAllBookings] = useState<IBooking[]>([]);

  // Hover Tooltip / Popover state
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  const dateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  // Fetch all active bookings for calendar view
  const fetchAllBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllBookings(json.data);
      }
    } catch (err) {
      console.error('Error fetching month bookings for calendar:', err);
    }
  };

  // Auto Refresh & event listener setup
  useEffect(() => {
    fetchAllBookings();

    const interval = setInterval(() => {
      fetchAllBookings();
    }, 5000);

    const handleUpdate = () => {
      fetchAllBookings();
      if (dateKey) {
        fetch(`/api/slots?date=${dateKey}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setAvailableSlots(json.data);
          });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('bookingUpdated', handleUpdate);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('bookingUpdated', handleUpdate);
      }
    };
  }, [dateKey]);

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

  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const constructWhatsAppUrl = (booking: IBooking) => {
    const formattedDate = selectedDate ? format(selectedDate, 'dd-MMM-yyyy') : booking.date;
    const pkgName = booking.packageName || selectedPackage?.name || 'Standard Review';
    const pkgPriceStr = formatPrice(booking.price || booking.packagePrice || selectedPackage?.price || 500);

    const messageText = `Hello,

I have successfully booked a slot.

Name: ${booking.name}
Phone: ${booking.phone}
Package: ${pkgName}
Date: ${formattedDate}
Slot: ${booking.slot}
Price: ${pkgPriceStr}

Please confirm my booking.

Thank you.`;

    const phoneTarget = '919645567295'; // Target WhatsApp number: +91 96455 67295
    return `https://wa.me/${phoneTarget}?text=${encodeURIComponent(messageText)}`;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) {
      toast.warning('Please select a review package.', 'Package Required');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast.warning('Please select a date and slot.', 'Slot Required');
      return;
    }
    if (!name || !phone) {
      toast.warning('Please enter both Full Name and Phone Number.', 'Missing Information');
      return;
    }

    setSubmitting(true);
    try {
      const selectedSlotObj = availableSlots.find((s) => s.time === selectedSlot);
      const slotDisplayName = selectedSlotObj?.displayName || selectedSlot;

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        date: dateKey,
        slot: slotDisplayName,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      let json: any = {};

      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const errText = await res.text();
        console.error('Non-JSON response received from /api/bookings:', errText);
        throw new Error('Server error processing booking. Please check your connection and try again.');
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit booking.');
      }

      const createdBooking: IBooking = json.booking;
      setBookingSuccess(createdBooking);

      // Trigger Confetti!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Refresh slots immediately so the slot card turns RED displaying Booked By info
      const slotsRes = await fetch(`/api/slots?date=${dateKey}`);
      const slotsJson = await slotsRes.json();
      if (slotsJson.success) {
        setAvailableSlots(slotsJson.data);
      }

      // Automatically redirect user to WhatsApp with prefilled message
      const waUrl = constructWhatsAppUrl(createdBooking);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = waUrl;
        }
      }, 1500);

      toast.success('Slot booked! Redirecting to WhatsApp...', 'Booking Saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not complete booking.', 'Booking Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {/* SUCCESS MODAL & WHATSAPP REDIRECT */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">Slot Booked Successfully!</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your booking details have been saved in MongoDB. Redirecting to WhatsApp for final confirmation...
              </p>
            </div>

            {/* Booking Details Summary */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Candidate Name</span>
                <span className="font-bold text-slate-900">{bookingSuccess.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Phone Number</span>
                <span className="font-bold text-slate-900">{bookingSuccess.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Selected Package</span>
                <span className="font-bold text-primary">{bookingSuccess.packageName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Date & Slot</span>
                <span className="font-bold text-slate-900">
                  {bookingSuccess.date} ({bookingSuccess.slot})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Package Price</span>
                <span className="font-black text-primary text-base">
                  {formatPrice(bookingSuccess.price || bookingSuccess.packagePrice)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={constructWhatsAppUrl(bookingSuccess)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 px-6 font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-base"
              >
                <MessageSquare className="w-5 h-5 fill-white text-emerald-600" />
                <span>Open WhatsApp Chat (+91 96455 67295)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => {
                  setBookingSuccess(null);
                  setSelectedSlot(null);
                  setName('');
                  setPhone('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="glass-card rounded-3xl border border-white/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 font-sans">
        {/* LEFT SUMMARY PANEL */}
        <div className="lg:col-span-4 bg-slate-900 text-white p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-accent border border-accent/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MorExpert Slot Booking</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              ❗ HOW TO PLACE ORDER
            </h2>

            <div className="space-y-3 text-xs text-slate-200 pt-1">
              <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-sm">
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">
                  Share the details (Old Resume or fill the shared format)
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-sm">
                <PackageIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">Choose a package</span>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-sm">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">
                  Complete the payment and share the payment screenshot
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-sm">
                <CalendarIcon className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">Select your preferred date</span>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-300 shadow-sm font-bold">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Your resume will be delivered before 11:59 PM
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2 text-xs">
            <p className="font-semibold text-slate-300 mb-1 uppercase tracking-wider">Slot Indicators</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Available Slots
              </span>
              <span className="text-emerald-400 font-semibold">Green</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Limited Slots
              </span>
              <span className="text-amber-400 font-semibold">Yellow</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Fully Booked Date
              </span>
              <span className="text-rose-400 font-semibold">Red</span>
            </div>
          </div>
        </div>

        {/* RIGHT ENGINE: 4 SECTIONS */}
        <div className="lg:col-span-8 p-6 sm:p-8 bg-white/80 space-y-8 relative">
          {/* SECTION 1: SELECT PACKAGE */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-primary" />
              <span>1. Select Package</span>
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

          {/* SECTION 2: SELECT DATE */}
          <div className="pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <span>2. Select Date</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <span className="text-sm font-bold text-slate-800 min-w-[110px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
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

                const dStr = format(day, 'yyyy-MM-dd');
                const dayBookings = allBookings.filter(
                  (b) => b.date === dStr && b.status !== 'Cancelled'
                );
                const isFullyBooked = dayBookings.length >= 3;
                const isLimited = dayBookings.length > 0 && dayBookings.length < 3;

                return (
                  <div key={idx} className="relative">
                    <button
                      disabled={isPast || !isCurrentMonth}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      onMouseEnter={() => {
                        if (isCurrentMonth) setHoveredDate(day);
                      }}
                      onMouseLeave={() => {
                        setHoveredDate(null);
                      }}
                      className={`w-full min-h-[96px] sm:min-h-[105px] rounded-2xl p-2 flex flex-col justify-between transition-all border text-left ${
                        !isCurrentMonth
                          ? 'opacity-20 cursor-not-allowed border-transparent bg-transparent'
                          : isPast
                          ? 'opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed'
                          : isSelected
                          ? isFullyBooked
                            ? 'bg-rose-600 text-white border-rose-700 shadow-lg shadow-rose-600/30 scale-[1.02] font-bold ring-2 ring-rose-400'
                            : 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02] font-bold ring-2 ring-primary/40'
                          : isFullyBooked
                          ? 'bg-rose-50 hover:bg-rose-100/90 border-rose-300 text-rose-950 shadow-sm'
                          : isLimited
                          ? 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-300 text-amber-950 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span
                          className={`text-xs sm:text-sm font-extrabold ${
                            isFullyBooked && !isSelected ? 'text-rose-700' : ''
                          }`}
                        >
                          {format(day, 'd')}
                        </span>

                        {!isPast && isCurrentMonth && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSelected
                                ? 'bg-white'
                                : isFullyBooked
                                ? 'bg-rose-500 animate-pulse'
                                : isLimited
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            title={
                              isFullyBooked
                                ? 'Fully Booked'
                                : isLimited
                                ? 'Limited Availability'
                                : 'Available'
                            }
                          />
                        )}
                      </div>

                      {/* Fully Booked Badge or Available Status */}
                      {isCurrentMonth && !isPast && (
                        <div className="mt-0.5 mb-1">
                          {isFullyBooked ? (
                            <span
                              className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider block text-center ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              Fully Booked
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] font-bold ${
                                isSelected
                                  ? 'text-blue-100'
                                  : isLimited
                                  ? 'text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {3 - dayBookings.length} {3 - dayBookings.length === 1 ? 'Slot Left' : 'Slots Left'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Booking Summary inside cell (3-letter name & price) */}
                      {isCurrentMonth && !isPast && dayBookings.length > 0 && (
                        <div className="space-y-0.5 w-full overflow-hidden">
                          {dayBookings.slice(0, 3).map((b, bIdx) => {
                            const rawName = (b.name || 'Candidate').trim();
                            const short3 = rawName.substring(0, 3);
                            const formatted3 = short3.charAt(0).toUpperCase() + short3.slice(1);
                            const priceStr = formatPrice(b.price || b.packagePrice || 500);

                            return (
                              <div
                                key={b.bookingId || bIdx}
                                className={`text-[10px] sm:text-[11px] font-extrabold leading-tight truncate px-1 py-0.5 rounded flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : isFullyBooked
                                    ? 'bg-rose-200/90 text-rose-950 border border-rose-300/60'
                                    : 'bg-slate-200/80 text-slate-900 border border-slate-300/50'
                                }`}
                              >
                                <span>{formatted3}</span>
                                <span>: {priceStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HOVER TOOLTIP / POPOVER OVERLAY */}
          {hoveredDate && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <h4 className="font-extrabold text-sm text-white">
                    {format(hoveredDate, 'MMMM d, yyyy')}
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                  Hover Details
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {['Slot 1', 'Slot 2', 'Slot 3'].map((slotNumName, sIdx) => {
                  const legacyTime = sIdx === 0 ? '09:00 AM' : sIdx === 1 ? '11:00 AM' : '03:00 PM';
                  const hStr = format(hoveredDate, 'yyyy-MM-dd');
                  const b = allBookings.find(
                    (bk) =>
                      bk.date === hStr &&
                      bk.status !== 'Cancelled' &&
                      (bk.slot === slotNumName || bk.slot === legacyTime)
                  );

                  if (b) {
                    return (
                      <div
                        key={slotNumName}
                        className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-1"
                      >
                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
                          <span className="font-black text-sky-400 uppercase tracking-wider text-[11px]">
                            {slotNumName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {b.status || 'Booked'}
                          </span>
                        </div>
                        <p className="font-extrabold text-white text-sm pt-0.5">{b.name}</p>
                        <div className="flex items-center justify-between text-slate-300 text-[11px]">
                          <span className="font-medium text-slate-400">
                            {b.packageName || 'Standard Package'}
                          </span>
                          <span className="font-black text-emerald-400">
                            {formatPrice(b.price || b.packagePrice || 500)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotNumName}
                      className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800/60 flex items-center justify-between text-slate-400"
                    >
                      <span className="font-bold text-slate-400">{slotNumName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        Available
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: SELECT SLOT (Booked cards display Booked by, Package, Price) */}
          {selectedDate && (
            <div className="pt-6 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>3. Select Slot for {format(selectedDate, 'MMM d, yyyy')}</span>
                </h3>
                {slotsLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availableSlots.map((s, idx) => {
                  const isSelected = selectedSlot === s.time;
                  const isBooked = !s.isAvailable || Boolean(s.bookedInfo);
                  const displayName = s.displayName || `Slot ${idx + 1}`;

                  if (isBooked && s.bookedInfo) {
                    // BOOKED SLOT DISPLAY CARD
                    return (
                      <div
                        key={s.time}
                        className="p-4 rounded-2xl border border-rose-200 bg-rose-50/90 text-left shadow-sm space-y-1.5 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-rose-200 pb-1.5">
                          <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                            {displayName} (Booked)
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          Booked by: <span className="text-rose-800 font-bold">{s.bookedInfo.name}</span>
                        </p>
                        <p className="text-xs text-slate-700">
                          Package: <span className="font-semibold">{s.bookedInfo.packageName}</span>
                        </p>
                        <p className="text-xs font-bold text-rose-700">
                          Price: {formatPrice(s.bookedInfo.price)}
                        </p>
                      </div>
                    );
                  }

                  if (isBooked && !s.bookedInfo) {
                    return (
                      <div
                        key={s.time}
                        className="p-4 rounded-2xl border border-rose-200 bg-rose-50/80 text-left shadow-sm opacity-70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-rose-800">{displayName}</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <p className="text-xs font-bold text-rose-600 mt-2">Fully Booked</p>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setSelectedSlot(s.time)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 font-bold scale-[1.02]'
                          : 'bg-emerald-50/40 hover:border-emerald-400 border-emerald-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base font-extrabold">{displayName}</span>
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                          }`}
                        >
                          Available
                        </span>
                        <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: ENTER YOUR DETAILS (Full Name & Phone Number ONLY) */}
          {selectedSlot && (
            <form
              onSubmit={handleBookingSubmit}
              className="pt-6 border-t border-slate-200/80 space-y-5 animate-in fade-in duration-300"
            >
              <h3 className="text-xl font-bold text-slate-900 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>4. Enter Your Details</span>
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                  Slot: {availableSlots.find((s) => s.time === selectedSlot)?.displayName || 'Selected'}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 text-base font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/25 hover:shadow-2xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Booking & Redirecting...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 fill-white text-emerald-600" />
                    <span>Confirm Booking & Open WhatsApp</span>
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
          <p className="text-sm font-medium">Loading Booking Page...</p>
        </div>
      }
    >
      <CalendlyCalendarContent />
    </Suspense>
  );
};
