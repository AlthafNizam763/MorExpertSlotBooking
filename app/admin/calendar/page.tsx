'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';

const DragDropCalendar = dynamic(
  () => import('@/components/Calendar/DragDropCalendar').then((mod) => mod.DragDropCalendar),
  { ssr: false, loading: () => <div className="p-12 text-center text-slate-500">Loading Calendar...</div> }
);

export default function AdminCalendarPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-6 overflow-x-hidden">
        <div className="pb-4 border-b border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Calendar & Drag-and-Drop Slot Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage daily appointments across Slot 1, Slot 2, and Slot 3 (maximum 3 slots per day).
          </p>
        </div>

        {/* INTERACTIVE DRAG & DROP AGENDA CALENDAR (SLOT 1, SLOT 2, SLOT 3) */}
        <DragDropCalendar />
      </main>
    </div>
  );
}
