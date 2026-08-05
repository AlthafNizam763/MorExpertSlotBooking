import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const conn = await connectToDatabase();
    let allBookings: any[] = [];

    if (conn) {
      try {
        allBookings = await Booking.find().sort({ createdAt: -1 }).lean();
      } catch (err) {
        console.warn('DB query failed, using fallback store:', err);
        allBookings = fallbackStore.bookings;
      }
    } else {
      allBookings = fallbackStore.bookings;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const todaysBookings = allBookings.filter((b) => b.date === todayStr).length;
    const pendingCount = allBookings.filter((b) => b.status === 'Pending').length;
    const completedCount = allBookings.filter((b) => b.status === 'Completed').length;
    const cancelledCount = allBookings.filter((b) => b.status === 'Cancelled').length;

    const totalRevenue = allBookings.reduce((sum, b) => {
      if (b.price && b.status !== 'Cancelled' && b.status !== 'Rejected') {
        return sum + Number(b.price);
      }
      return sum;
    }, 0);

    // Monthly breakdown data for charts
    const monthlyStatsMap: Record<string, { month: string; bookings: number; revenue: number }> =
      {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Prepopulate current year months
    months.forEach((m) => {
      monthlyStatsMap[m] = { month: m, bookings: 0, revenue: 0 };
    });

    allBookings.forEach((b) => {
      const dateObj = new Date(b.createdAt || b.date);
      const monthName = months[dateObj.getMonth()];
      if (monthlyStatsMap[monthName]) {
        monthlyStatsMap[monthName].bookings += 1;
        if (b.price && b.status !== 'Cancelled' && b.status !== 'Rejected') {
          monthlyStatsMap[monthName].revenue += Number(b.price);
        }
      }
    });

    const monthlyChartData = Object.values(monthlyStatsMap);
    const recentBookings = allBookings.slice(0, 6);

    return NextResponse.json({
      success: true,
      stats: {
        todaysBookings,
        pendingCount,
        completedCount,
        cancelledCount,
        totalRevenue,
        totalBookings: allBookings.length,
      },
      monthlyChartData,
      recentBookings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
