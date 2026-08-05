'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Calendar, Search, ShieldCheck, Menu, X, ArrowRight } from 'lucide-react';

import { MorExpertLogo } from '@/components/Common/MorExpertLogo';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Book Slot', href: '/book' },
    { name: 'Track Booking', href: '/track' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Pricing', href: '/#pricing' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/75 border-b border-slate-200/60 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <MorExpertLogo size={42} />
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-primary to-blue-700 bg-clip-text text-transparent tracking-tight">
                MorExpert
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-primary">
                Slot Booking
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/60 p-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-primary shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:text-primary transition-colors border border-slate-200 hover:border-primary/40 rounded-xl bg-white/50"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Admin Login</span>
            </Link>

            <Link
              href="/book"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all transform hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Your Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              Admin Portal
            </Link>
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-primary rounded-xl shadow-md"
            >
              <Calendar className="w-4 h-4" />
              Book Your Slot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
