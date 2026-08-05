'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/Dashboard/AdminSidebar';
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Calendar,
  FileText,
  ChevronRight,
  User,
  Sparkles,
} from 'lucide-react';
import { formatPrice, getStatusBadgeClass } from '@/lib/utils';
import { IBooking } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaysBookings: 0,
    pendingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalRevenue: 0,
    totalBookings: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<IBooking[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setStats(json.stats);
          setMonthlyData(json.monthlyChartData || []);
          setRecentBookings(json.recentBookings || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-10 space-y-8 overflow-x-hidden">
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Executive Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live metrics, slot booking performance, and revenue analytics for MorExpert platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/bookings"
              className="px-4 py-2.5 bg-primary hover:bg-blue-600 font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Manage All Bookings</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-slate-400">Loading analytics dashboard...</p>
          </div>
        ) : (
          <>
            {/* METRICS CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {/* Card 1: Today's Bookings */}
              <div className="glass-card-dark p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Today's Bookings
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">{stats.todaysBookings}</span>
                  <span className="text-xs text-blue-400 font-medium flex items-center gap-0.5">
                    Today
                  </span>
                </div>
              </div>

              {/* Card 2: Pending */}
              <div className="glass-card-dark p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pending Review
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-amber-400">{stats.pendingCount}</span>
                  <span className="text-xs text-slate-400">Needs Price</span>
                </div>
              </div>

              {/* Card 3: Completed */}
              <div className="glass-card-dark p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Completed
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-emerald-400">
                    {stats.completedCount}
                  </span>
                  <span className="text-xs text-emerald-400">Done</span>
                </div>
              </div>

              {/* Card 4: Cancelled */}
              <div className="glass-card-dark p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cancelled
                  </span>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-rose-400">{stats.cancelledCount}</span>
                  <span className="text-xs text-slate-400">Slots</span>
                </div>
              </div>

              {/* Card 5: Revenue */}
              <div className="glass-card-dark p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-sky-400">
                    ₹{stats.totalRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-sky-400 font-medium">Assigned</span>
                </div>
              </div>
            </div>

            {/* MONTHLY BOOKINGS & REVENUE GRAPH */}
            <div className="glass-card-dark p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span>Monthly Bookings & Revenue Overview</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Visual breakdown of review requests and generated revenue across months.
                  </p>
                </div>
              </div>

              {/* Custom CSS SVG Bar Graph */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-12 gap-2 sm:gap-4 items-end h-64 border-b border-slate-800 pb-4">
                  {monthlyData.map((item, idx) => {
                    const maxBookings = Math.max(...monthlyData.map((d) => d.bookings), 10);
                    const heightPercent = Math.round((item.bookings / maxBookings) * 100);

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          {item.bookings}
                        </div>
                        <div
                          style={{ height: `${Math.max(heightPercent, 12)}%` }}
                          className="w-full max-w-[36px] bg-gradient-to-t from-primary via-blue-500 to-accent rounded-t-xl group-hover:brightness-125 transition-all shadow-lg shadow-primary/25 relative"
                        />
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RECENT BOOKINGS TABLE */}
            <div className="glass-card-dark p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>Recent Slot Bookings</span>
                </h3>
                <Link
                  href="/admin/bookings"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All Bookings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {recentBookings.map((b) => {
                      const badgeStyle = getStatusBadgeClass(b.status);
                      return (
                        <tr key={b.bookingId} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">
                            {b.bookingId}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{b.name}</div>
                            <div className="text-[11px] text-slate-500">{b.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {b.date} ({b.slot})
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            {formatPrice(b.price)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/bookings?highlight=${b.bookingId}`}
                              className="text-xs font-semibold text-accent hover:underline"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
