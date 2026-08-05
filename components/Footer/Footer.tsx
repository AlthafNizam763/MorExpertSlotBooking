'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, ShieldCheck, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

import { MorExpertLogo } from '@/components/Common/MorExpertLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary text-slate-300 pt-16 pb-12 border-t border-slate-800 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <MorExpertLogo size={40} />
              <span className="text-xl font-bold text-white tracking-tight">MorExpert</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Build a high-converting resume that passes ATS filters and impresses hiring managers at top tech companies.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Slots Open for This Week
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Navigation</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  Book Slot
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-primary transition-colors">Track Booking Status</Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary transition-colors">Pricing Options</Link>
              </li>
            </ul>
          </div>

          {/* Admin & Security */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Platform & Admin</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Admin Dashboard Login
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-primary transition-colors">Slot Management</Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-primary transition-colors">Price Assignment</Link>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                Protected by JWT Admin Auth & 256-bit encryption.
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support & Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <span>support@morexpert.com</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>Bangalore / Remote Online</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MorExpert Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Cookie Settings</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
