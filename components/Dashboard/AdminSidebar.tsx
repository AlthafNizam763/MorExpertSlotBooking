'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  DollarSign,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { name: 'Calendar & Slots', href: '/admin/calendar', icon: CalendarDays },
    { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-6 flex flex-col justify-between border-r border-slate-800 shrink-0">
      <div className="space-y-8">
        {/* Logo */}
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">MorExpert</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-accent">
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
            A
          </div>
          <div className="overflow-hidden text-xs">
            <p className="font-bold text-white truncate">MorExpert Admin</p>
            <p className="text-slate-500 truncate">admin@morexpert.com</p>
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
    </aside>
  );
};
