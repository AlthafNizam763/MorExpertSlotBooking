'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  LogOut,
  Package,
  Menu,
  X,
} from 'lucide-react';
import { MorExpertLogo } from '@/components/Common/MorExpertLogo';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { name: 'Package Management', href: '/admin/packages', icon: Package },
    { name: 'Calendar & Drag-and-Drop Slot Management', href: '/admin/calendar', icon: CalendarDays },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navContent = (
    <>
      <div className="space-y-8">
        {/* Logo */}
        <Link
          href="/admin/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 group"
        >
          <MorExpertLogo size={36} />
          <div>
            <span className="text-lg font-bold text-white tracking-tight">MorExpert</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-sky-400">
              Admin Portal
            </span>
          </div>
        </Link>

        {/* Menu Navigation */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout & Footer info */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-sm">
            <MorExpertLogo size={36} />
          </div>
          <div className="overflow-hidden text-xs">
            <p className="font-bold text-white truncate">MorExpert Admin</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* MOBILE TOP BAR (visible on < lg screens) */}
      <header className="lg:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <MorExpertLogo size={32} />
          <div>
            <span className="text-base font-bold text-white tracking-tight">MorExpert</span>
            <span className="block text-[9px] uppercase font-bold tracking-widest text-sky-400">
              Admin Portal
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          aria-label="Toggle Navigation Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE OVERLAY DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-out Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full p-6 flex flex-col justify-between border-r border-slate-800 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR (visible on >= lg screens) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 min-h-screen p-6 flex-col justify-between border-r border-slate-800 shrink-0">
        {navContent}
      </aside>
    </>
  );
};
