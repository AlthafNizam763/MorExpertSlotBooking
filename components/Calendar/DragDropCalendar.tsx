'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { CalendarDays, Clock, MoveRight, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { IBooking } from '@/types';
import { getStatusBadgeClass } from '@/lib/utils';
import { useToast, useConfirm } from '@/components/Notification/ToastContext';

export const DragDropCalendar: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedBooking, setDraggedBooking] = useState<IBooking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const json = await res.json();
      if (json.success) {
        setBookings(json.data);
      }
    } catch (err) {
      console.error('Error fetching calendar bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(currentWeekStart, offset));
  const timeSlots = ['09:00 AM', '11:00 AM', '03:00 PM'];

  const handleDragStart = (e: React.DragEvent, booking: IBooking) => {
    setDraggedBooking(booking);
    e.dataTransfer.setData('text/plain', booking.bookingId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string, targetSlot: string) => {
    e.preventDefault();
    if (!draggedBooking) return;

    if (draggedBooking.date === targetDate && draggedBooking.slot === targetSlot) return;

    const isConfirmed = await confirm({
      title: 'Reschedule Booking Slot',
      message: `Move booking ${draggedBooking.bookingId} (${draggedBooking.name}) to ${targetDate} at ${targetSlot}?`,
      confirmText: 'Confirm Reschedule',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/bookings/${draggedBooking._id || draggedBooking.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rescheduled',
          rescheduleDate: targetDate,
          rescheduleSlot: targetSlot,
          remarks: `Drag & drop rescheduled to ${targetDate} (${targetSlot}).`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Rescheduled ${draggedBooking.bookingId} to ${targetDate} (${targetSlot})`, 'Slot Updated');
        fetchBookings();
      } else {
        toast.error(json.error || 'Failed to reschedule booking slot.', 'Reschedule Error');
      }
    } catch (err) {
      toast.error('Failed to reschedule booking slot.', 'Network Error');
    } finally {
      setDraggedBooking(null);
    }
  };

  return (
    <div className="glass-card-dark p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span>Interactive Drag & Drop Weekly Agenda</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Drag any booking card to a new date/slot cell to instantly reschedule appointments.
          </p>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Approved
          </span>
          <span className="flex items-center gap-1.5 font-bold text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
          </span>
          <span className="flex items-center gap-1.5 font-bold text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Rescheduled
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cancelled
          </span>
        </div>
      </div>

      {/* Agenda Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-2 pb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <div className="py-2 text-left pl-2">Slot Time</div>
            {weekDays.map((d, i) => (
              <div key={i} className="py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div>{format(d, 'EEE')}</div>
                <div className="text-white text-sm font-extrabold">{format(d, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {/* Slot Rows */}
          <div className="space-y-2 pt-2">
            {timeSlots.map((slotTime) => (
              <div key={slotTime} className="grid grid-cols-8 gap-2 items-stretch min-h-[90px]">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center font-mono font-bold text-xs text-accent">
                  <Clock className="w-4 h-4 mr-1.5 shrink-0" />
                  {slotTime}
                </div>

                {weekDays.map((dayObj, dayIdx) => {
                  const dateStr = format(dayObj, 'yyyy-MM-dd');
                  const slotBookings = bookings.filter(
                    (b) => b.date === dateStr && b.slot === slotTime
                  );

                  return (
                    <div
                      key={dayIdx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr, slotTime)}
                      className="p-2 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-primary/50 transition-colors space-y-2 flex flex-col justify-start"
                    >
                      {slotBookings.map((b) => {
                        const badgeStyle = getStatusBadgeClass(b.status);
                        return (
                          <div
                            key={b.bookingId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, b)}
                            className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-primary cursor-grab active:cursor-grabbing shadow-md space-y-1 group transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[10px] text-primary">
                                {b.bookingId}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  b.status === 'Approved'
                                    ? 'bg-emerald-500'
                                    : b.status === 'Rescheduled'
                                    ? 'bg-purple-500'
                                    : b.status === 'Cancelled'
                                    ? 'bg-rose-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <p className="font-bold text-white text-xs truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{b.phone}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
