import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import Slot from '@/lib/models/Slot';
import { generateBookingId } from '@/lib/utils';
import { fallbackStore } from '@/lib/fallbackStore';
import { IBooking } from '@/types';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const date = searchParams.get('date') || '';
    const lookup = searchParams.get('lookup') || '';

    const conn = await connectToDatabase();

    if (conn) {
      try {
        const query: any = {};

        if (lookup) {
          query.$or = [
            { bookingId: { $regex: lookup, $options: 'i' } },
            { phone: { $regex: lookup, $options: 'i' } },
            { email: { $regex: lookup, $options: 'i' } },
          ];
        } else {
          if (status) query.status = status;
          if (date) query.date = date;
          if (search) {
            query.$or = [
              { bookingId: { $regex: search, $options: 'i' } },
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
            ];
          }
        }

        const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: bookings });
      } catch (err) {
        console.warn('DB Query failed, using fallback store:', err);
      }
    }

    // Fallback store filter
    let list = [...fallbackStore.bookings];

    if (lookup) {
      const trimmed = lookup.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.bookingId.toLowerCase().includes(trimmed) ||
          b.phone.toLowerCase().includes(trimmed) ||
          b.email.toLowerCase().includes(trimmed)
      );
    } else {
      if (status) {
        list = list.filter((b) => b.status === status);
      }
      if (date) {
        list = list.filter((b) => b.date === date);
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (b) =>
            b.bookingId.toLowerCase().includes(s) ||
            b.name.toLowerCase().includes(s) ||
            b.email.toLowerCase().includes(s) ||
            b.phone.toLowerCase().includes(s)
        );
      }
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const date = formData.get('date') as string;
    const slot = formData.get('slot') as string;
    const notes = (formData.get('notes') as string) || '';
    const resumeFile = formData.get('resume') as File | null;

    if (!name || !email || !phone || !date || !slot) {
      return NextResponse.json(
        { error: 'All required fields (Name, Email, Phone, Date, Slot) must be provided.' },
        { status: 400 }
      );
    }

    let resumeUrl = '';

    // File validation: PDF check & 10MB limit (if uploaded)
    if (resumeFile && typeof resumeFile === 'object' && resumeFile.name) {
      if (resumeFile.type !== 'application/pdf' && !resumeFile.name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'Only PDF documents are supported for resume uploads.' }, { status: 400 });
      }

      if (resumeFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Resume file size cannot exceed 10MB.' }, { status: 400 });
      }

      // Save PDF file to public/uploads
      const bytes = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const sanitizedFileName = `${Date.now()}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, sanitizedFileName);
      await fs.writeFile(filePath, buffer);

      resumeUrl = `/uploads/${sanitizedFileName}`;
    }

    const bookingId = generateBookingId();

    const newBookingData: IBooking = {
      bookingId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      resume: resumeUrl,
      notes: notes.trim(),
      date,
      slot,
      status: 'Pending',
      price: null,
      remarks: '',
      createdAt: new Date().toISOString(),
    };

    const conn = await connectToDatabase();
    let createdBooking: any = null;

    if (conn) {
      try {
        createdBooking = await Booking.create(newBookingData);

        // Update slot booked count
        await Slot.findOneAndUpdate(
          { date, time: slot },
          { $inc: { booked: 1 } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('DB creation failed, pushing to fallback store:', err);
      }
    }

    if (!createdBooking) {
      const fallbackBooking: IBooking = {
        _id: `b-${Date.now()}`,
        ...newBookingData,
      };
      fallbackStore.bookings.unshift(fallbackBooking);
      createdBooking = fallbackBooking;
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: createdBooking.bookingId,
      booking: createdBooking,
    });
  } catch (error: any) {
    console.error('Booking Creation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process booking' }, { status: 500 });
  }
}
