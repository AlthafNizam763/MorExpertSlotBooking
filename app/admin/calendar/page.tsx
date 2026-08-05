'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import { CalendarDays, Clock, Check, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/Notification/ToastContext';

const DragDropCalendar = dynamic(
  () => import('@/components/Calendar/DragDropCalendar').then((mod) => mod.DragDropCalendar),
  { ssr: false, loading: () => <div className="p-12 text-center text-slate-500">Loading Calendar...</div> }
);

export default function AdminCalendarPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slot1Time, setSlot1Time] = useState('09:00 AM');
  const [slot2Time, setSlot2Time] = useState('11:00 AM');
  const [slot3Time, setSlot3Time] = useState('03:00 PM');
  const [isHoliday, setIsHoliday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: slot1Time,
          isAvailable: !isHoliday,
        }),
      });

      await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: slot2Time,
          isAvailable: !isHoliday,
        }),
      });

      await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: slot3Time,
          isAvailable: !isHoliday,
        }),
      });

      const msg = `Slots and holiday configuration for ${selectedDate} updated successfully!`;
      setSuccessMsg(msg);
      toast.success(msg, 'Slots Configured');
    } catch (err: any) {
      toast.error(err.message || 'Error updating slots.', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Calendar & Drag-Drop Slot Management</h1>
            <p className="text-xs text-slate-400 mt-1">
              Drag bookings across agenda cells to reschedule appointments, configure daily timings, or mark holidays.
            </p>
          </div>
        </div>

        {/* INTERACTIVE DRAG & DROP AGENDA CALENDAR */}
        <DragDropCalendar />

        {/* SLOT TIMINGS & HOLIDAY CONFIGURATION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-5 glass-card-dark p-6 rounded-3xl border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>Select Date to Configure</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-primary focus:outline-none font-mono"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={isHoliday}
                  onChange={(e) => setIsHoliday(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-0"
                />
                <div>
                  <p className="text-sm font-bold text-white">Mark as Holiday / Disabled</p>
                  <p className="text-xs text-slate-400">
                    Prevents user bookings for all slots on this date.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 glass-card-dark p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>Slot Timings for {selectedDate}</span>
            </h3>

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSlots} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Slot 1 (Morning)
                  </label>
                  <input
                    type="text"
                    value={slot1Time}
                    onChange={(e) => setSlot1Time(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Slot 2 (Afternoon)
                  </label>
                  <input
                    type="text"
                    value={slot2Time}
                    onChange={(e) => setSlot2Time(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Slot 3 (Evening)
                  </label>
                  <input
                    type="text"
                    value={slot3Time}
                    onChange={(e) => setSlot3Time(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 px-4 font-bold text-white bg-primary hover:bg-blue-600 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>Save Slot Configuration</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
