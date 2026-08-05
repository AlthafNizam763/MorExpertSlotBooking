'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar/Navbar';
import { Footer } from '@/components/Footer/Footer';
import { CalendlyCalendar } from '@/components/Calendar/CalendlyCalendar';

export default function BookPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-secondary tracking-tight">
            Booking Your Slot
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base max-w-xl mx-auto">
            Select an available date, pick your slot time, and upload your PDF resume to reserve your session instantly.
          </p>
        </div>

        <CalendlyCalendar />
      </main>

      <Footer />
    </div>
  );
}
