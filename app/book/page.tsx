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
            Book Your Slot
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base max-w-xl mx-auto">
            Pick your package, date and slot, then pay by UPI. Your slot is held while you pay and
            confirmed the moment you upload your payment screenshot.
          </p>
        </div>

        <CalendlyCalendar />
      </main>

      <Footer />
    </div>
  );
}
