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
    let csv =
      'Booking ID,Customer Name,Email,Phone,Booking Date,Slot,Package,Package Price (INR),Booking Status,Payment Status,Amount Paid (INR),Payment Screenshot,Gateway Reference,Payment Verified By,Paid At,Created At\n';

    const cell = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    bookingsList.forEach((b) => {
      const line = [
        cell(b.bookingId),
        cell(b.name),
        cell(b.email),
        cell(b.phone),
        cell(b.date),
        cell(b.slot),
        cell(b.packageName || ''),
        cell(b.packagePrice ?? b.price ?? 'Not Assigned'),
        cell(b.status),
        cell(b.paymentStatus || 'Not Recorded'),
        cell(b.amountPaid ?? ''),
        cell(b.paymentProofUrl || ''),
        cell(b.transactionRef || ''),
        cell(b.paymentVerifiedBy || ''),
        cell(b.paidAt || ''),
        cell(b.createdAt),
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
