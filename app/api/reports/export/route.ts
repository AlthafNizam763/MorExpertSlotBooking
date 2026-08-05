import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conn = await connectToDatabase();
    let bookingsList: any[] = [];

    if (conn) {
      try {
        bookingsList = await Booking.find().sort({ createdAt: -1 }).lean();
      } catch (err) {
        bookingsList = fallbackStore.bookings;
      }
    } else {
      bookingsList = fallbackStore.bookings;
    }

    // Build CSV Header
    let csv = 'Booking ID,Candidate Name,Email,Phone,Date,Slot,Status,Assigned Price (INR),Created At\n';

    bookingsList.forEach((b) => {
      const line = [
        `"${b.bookingId}"`,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.email}"`,
        `"${b.phone}"`,
        `"${b.date}"`,
        `"${b.slot}"`,
        `"${b.status}"`,
        `"${b.price !== null && b.price !== undefined ? b.price : 'Not Assigned'}"`,
        `"${b.createdAt}"`,
      ].join(',');
      csv += line + '\n';
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=MorExpert_Bookings_Report_${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export error' }, { status: 500 });
  }
}
